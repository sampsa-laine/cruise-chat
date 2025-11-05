# Cruise Chat

CruiseChat aims to be a simple messaging app that works with peer-to-peer connections and therefore doesn't require internet. It requires the users to be close by and therefore is intended to be used on ships.

## Features

- Enhanced logging
- Basic chatrooms with room keys
- Notifications
- Gifs

## Todo

- Add more gifs. Add the (not that large) files to assets/chats/ and then modify components/ChatWindow.tsx somewhere around line 85
- Send notification on batch receive if they are more recent
- Don't send notifications when open in the chatroom
- Automatic service start
- Throttling users (limit messages sent per second)

## Developing the native module

[Instructions](https://docs.expo.dev/modules/get-started/#edit-the-module)
