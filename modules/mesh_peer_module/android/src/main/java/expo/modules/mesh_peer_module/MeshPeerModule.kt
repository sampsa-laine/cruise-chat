package expo.modules.mesh_peer_module

import android.Manifest
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.ServiceConnection
import android.content.pm.PackageManager
import android.os.Build
import android.os.IBinder
import android.util.Log
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import expo.modules.kotlin.Promise
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.net.URL
import androidx.core.content.edit

data class Message(
    val id: String,
    val content: String,
    val userId: String,
    val createdAt: Long,
    val chatId: String
)

class MeshPeerModule : Module(), NearbyService.NearbyServiceListener {
  private var nearbyService: NearbyService? = null

  private val TAG = "MeshPeerModule"

  companion object {
    private const val REQUEST_CODE_PERMISSIONS = 1234
  }

  private val requiredPermissions: List<String>
    get() {
      val basePermissions = mutableListOf<String>()
      
      basePermissions.add(Manifest.permission.ACCESS_FINE_LOCATION)
      
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
        basePermissions.addAll(listOf(
          Manifest.permission.BLUETOOTH_ADVERTISE,
          Manifest.permission.BLUETOOTH_CONNECT,
          Manifest.permission.BLUETOOTH_SCAN,
        ))
      } else {
        basePermissions.addAll(listOf(
          Manifest.permission.BLUETOOTH,
          Manifest.permission.BLUETOOTH_ADMIN
        ))
      }
      
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
        basePermissions.add(Manifest.permission.POST_NOTIFICATIONS)
        basePermissions.add(Manifest.permission.NEARBY_WIFI_DEVICES)
      }
      
      return basePermissions
    }

  // Service connection callbacks
  private val serviceConnection = object : ServiceConnection {
    override fun onServiceConnected(name: ComponentName?, service: IBinder?) {
      val binder = service as NearbyService.LocalBinder
      nearbyService = binder.getService()
      nearbyService?.setListener(this@MeshPeerModule)
      val discoveryStarted = nearbyService?.startFindConnections() ?: false
      if(discoveryStarted) {
        Log.d(TAG, "Started automatic discovery in NearbyService")
      }
    }

    override fun onServiceDisconnected(name: ComponentName?) {
      nearbyService = null
    }
  }

  private fun debugLog(message: String) {
    sendEvent("onDebug", mapOf("message" to message))
  }

  override fun onPeerConnected(endpointId: String) {
    debugLog("Peer connected")
    sendEvent("onPeerConnected", mapOf("endpointId" to endpointId))
  }

  override fun onPeerDisconnected(endpointId: String) {
    sendEvent("onPeerDisconnected", mapOf("endpointId" to endpointId))
  }

  override fun onMessageReceived(endpointId: String, message: String) {
    sendEvent("onMessageReceived", mapOf(
      "endpointId" to endpointId,
      "message" to message
    ))
  }

  override fun onConnectionFailed(endpointId: String, error: String) {
    sendEvent("onConnectionFailed", mapOf(
      "endpointId" to endpointId,
      "error" to error
    ))
  }

  override fun onNewMessages(count: Int, totalMessages: Int) {
    sendEvent("onNewMessages", mapOf(
      "count" to count,
      "totalMessages" to totalMessages
    ))
  }

  override fun definition() = ModuleDefinition {
    Name("MeshPeerModule")

    OnCreate {

    }

    OnDestroy {
      unbindFromNearbyService()
    }

    Events(
      "onPeerDiscovered",
      "onPeerConnected", 
      "onPeerDisconnected",
      "onPeerLost",
      "onMessageReceived",
      "onConnectionFailed",
      "onNewMessages",
      "onDebug"
    )

    AsyncFunction("checkPermissions") { promise: Promise ->
      val context = appContext.reactContext ?: run {
        promise.reject("NO_CONTEXT", "App context is not available", null)
        return@AsyncFunction
      }
      val allGranted = requiredPermissions.all {
        ContextCompat.checkSelfPermission(context, it) == PackageManager.PERMISSION_GRANTED
      }
      promise.resolve(allGranted)
    }

    AsyncFunction("requestPermissions") { promise: Promise ->
      val activity = appContext.currentActivity ?: run {
        promise.reject("NO_ACTIVITY", "Activity not available", null)
        return@AsyncFunction
      }

      val notGranted = requiredPermissions.filter {
        ContextCompat.checkSelfPermission(activity, it) != PackageManager.PERMISSION_GRANTED
      }

      if (notGranted.isEmpty()) {
        promise.resolve(true)
        return@AsyncFunction
      }

      ActivityCompat.requestPermissions(activity, notGranted.toTypedArray(), REQUEST_CODE_PERMISSIONS)
      promise.resolve(true)
    }

    AsyncFunction("startDiscovery") { promise: Promise ->
      Log.d(TAG, "startDiscovery called")
      
      if (!hasRequiredPermissions()) {
        Log.w(TAG, "startDiscovery failed: permissions not granted")
        promise.reject("PERMISSION_DENIED", "Required permissions not granted", null)
        return@AsyncFunction
      }

      Log.d(TAG, "Nearbyservice: $nearbyService");
      val success: Boolean = nearbyService?.startFindConnections() ?: false
      if (success) {
        Log.d(TAG, "startDiscovery succeeded")
        promise.resolve(null)
      } else {
        Log.e(TAG, "startDiscovery failed")
        promise.reject("DISCOVERY_FAILED", "Failed to start discovery", null)
      }
    }

    AsyncFunction("stopDiscovery") { promise: Promise ->
      nearbyService?.stopFindConnections()
      promise.resolve(null)
    }

    AsyncFunction("sendMessage") {id: String, content: String, userId: String, createdAt: Long, chatId: String, promise: Promise ->
      val message = Message(id=id, content=content, userId=userId, createdAt=createdAt, chatId=chatId)
      val success = nearbyService?.sendMessage(message) ?: false
      if (success) {
        promise.resolve(null)
      } else {
        promise.reject("SEND_FAILED", "Failed to send message", null)
      }
    }

    AsyncFunction("getConnectedPeers") { promise: Promise ->
      val peers = nearbyService?.connectionHandler?.getConnectedPeers() ?: emptyList()
      promise.resolve(peers)
    }

    AsyncFunction("disconnectFromPeer") { endpointId: String, promise: Promise ->
      nearbyService?.connectionHandler?.disconnectFromPeer(endpointId)
      promise.resolve(null)
    }

    AsyncFunction("disconnectFromAllPeers") { promise: Promise ->
      nearbyService?.connectionHandler?.disconnectFromAllPeers()
      promise.resolve(null)
    }

    AsyncFunction("startNearbyService") { promise: Promise ->
      try {
        val context = appContext.reactContext!!
        val intent = Intent(context, NearbyService::class.java)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
          // startForegroundService() was introduced in O, just call startService for before O.
          context.startForegroundService(intent)
        } else {
          context.startService(intent)
        }
        if (!bindToNearbyService()) {
          Log.d(TAG, "Failed to bind to nearby service");
          promise.reject("SERVICE_START_FAILED","Failed to bind to nearby service", null);
          return@AsyncFunction
        }
        Log.d(TAG, "Service started successfully")
        promise.resolve("Service started successfully")
      } catch (e: Exception) {
        promise.reject("SERVICE_START_FAILED", "Failed to start Nearby service: ${e.message}", e)
      }
    }

    AsyncFunction("stopNearbyService") { promise: Promise ->
      try {
        unbindFromNearbyService()
        val context = appContext.reactContext!!
        val intent = Intent(context, NearbyService::class.java)
        context.stopService(intent)
        promise.resolve("Service stopped successfully")
      } catch (e: Exception) {
        promise.reject("SERVICE_STOP_FAILED", "Failed to stop Nearby service: ${e.message}", e)
      }
    }

    AsyncFunction("getRelevantMessageIds") { promise: Promise ->
      try {
        val messageIds = nearbyService?.getRelevantMessageIds() ?: emptyList()
        promise.resolve(messageIds)
      } catch (e: Exception) {
        promise.reject("DATABASE_ERROR", "Failed to get message IDs: ${e.message}", e)
      }
    }

    AsyncFunction("getMessageCount") { promise: Promise ->
      try {
        val count = nearbyService?.getMessageCount() ?: 0
        promise.resolve(count)
      } catch (e: Exception) {
        promise.reject("DATABASE_ERROR", "Failed to get message count: ${e.message}", e)
      }
    }

    AsyncFunction("getUsername") { promise: Promise ->
      try {
        val context = appContext.reactContext ?: run {
          promise.reject("NO_CONTEXT", "App context is not available", null)
          return@AsyncFunction
        }
        val sharedPrefs = context.getSharedPreferences("cruise_chat_prefs", android.content.Context.MODE_PRIVATE)
        val username = sharedPrefs.getString("username", null)
        promise.resolve(username)
      } catch (e: Exception) {
        promise.reject("GET_USERNAME_ERROR", "Failed to get username: ${e.message}", e)
      }
    }

    AsyncFunction("setUsername") { username: String, promise: Promise ->
      try {
        val context = appContext.reactContext ?: run {
          promise.reject("NO_CONTEXT", "App context is not available", null)
          return@AsyncFunction
        }
        val sharedPrefs = context.getSharedPreferences("cruise_chat_prefs", android.content.Context.MODE_PRIVATE)
        sharedPrefs.edit(commit = true) { putString("username", username) }

        promise.resolve(null)
      } catch (e: Exception) {
        promise.reject("SET_USERNAME_ERROR", "Failed to set username: ${e.message}", e)
      }
    }

    AsyncFunction("isServiceRunning") { promise: Promise ->
      try {
        val isRunning = nearbyService?.isServiceRunning() ?: false
        promise.resolve(isRunning)
      } catch (e: Exception) {
        promise.reject("STATE_ERROR", "Failed to get service state: ${e.message}", e)
      }
    }

    AsyncFunction("isDiscovering") { promise: Promise ->
      try {
        val discovering = nearbyService?.isDiscovering() ?: false
        promise.resolve(discovering)
      } catch (e: Exception) {
        promise.reject("STATE_ERROR", "Failed to get discovery state: ${e.message}", e)
      }
    }

    AsyncFunction("subscribeToNotifications") { chatId: String, promise: Promise ->
      try {
        val success = nearbyService?.subscribeToNotifications(chatId) ?: false
        promise.resolve(success)
      } catch (e: Exception) {
        promise.reject("SUBSCRIBE_ERROR", "Failed to subscribe to notifications: ${e.message}", e)
      }
    }

    AsyncFunction("unsubscribeFromNotifications") { chatId: String, promise: Promise ->
      try {
        val success = nearbyService?.unsubscribeFromNotifications(chatId) ?: false
        promise.resolve(success)
      } catch (e: Exception) {
        promise.reject("UNSUBSCRIBE_ERROR", "Failed to unsubscribe from notifications: ${e.message}", e)
      }
    }

    AsyncFunction("getNotificationSubscriptions") { promise: Promise ->
      try {
        val subscriptions = nearbyService?.getNotificationSubscriptions() ?: emptyList()
        promise.resolve(subscriptions)
      } catch (e: Exception) {
        promise.reject("GET_SUBSCRIPTIONS_ERROR", "Failed to get notification subscriptions: ${e.message}", e)
      }
    }

    AsyncFunction("isSubscribedToNotifications") { chatId: String, promise: Promise ->
      try {
        val isSubscribed = nearbyService?.isSubscribedToNotifications(chatId) ?: false
        promise.resolve(isSubscribed)
      } catch (e: Exception) {
        promise.reject("CHECK_SUBSCRIPTION_ERROR", "Failed to check notification subscription: ${e.message}", e)
      }
    }

    AsyncFunction("clearNotificationSubscriptions") { promise: Promise ->
      try {
        nearbyService?.clearNotificationSubscriptions()
        promise.resolve(null)
      } catch (e: Exception) {
        promise.reject("CLEAR_SUBSCRIPTIONS_ERROR", "Failed to clear notification subscriptions: ${e.message}", e)
      }
    }

    View(MeshPeerModuleView::class) {
      Prop("url") { view: MeshPeerModuleView, url: URL ->
        view.webView.loadUrl(url.toString())
      }
      Events("onLoad")
    }
  }

  private fun bindToNearbyService(): Boolean {
    val context = appContext.reactContext ?: return false
    Log.d(TAG, "Binding to service..");
    val intent = Intent(context, NearbyService::class.java)
    return context.bindService(intent, serviceConnection, Context.BIND_AUTO_CREATE)
  }

  private fun unbindFromNearbyService() {
    if (nearbyService != null) {
      val context = appContext.reactContext ?: return
      context.unbindService(serviceConnection)
      nearbyService?.setListener(null)
      nearbyService = null
    }
  }

  private fun hasRequiredPermissions(): Boolean {
    val context = appContext.reactContext ?: return false
    return requiredPermissions.all { permission ->
      ContextCompat.checkSelfPermission(context, permission) == PackageManager.PERMISSION_GRANTED
    }
  }
}
