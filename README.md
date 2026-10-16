# Messages

Zero-dependency Node.js app (needs Node 18+). No npm install, no configuration.

## Run locally
    node server.js        # open http://localhost:3000

## Deploy on a free host (example: Render)
1. Put these files in a GitHub repo and create a new "Web Service" from it.
2. Build command: leave empty (or `echo ok`). Start command: `node server.js`.
3. The host sets PORT automatically.

## Keeping data
Messages, events, and uploads are stored in the `data/` folder. Free hosts usually
erase it on restart. To keep it, add a persistent disk and set the environment
variable DATA_DIR to the disk's mount path (for example /var/data).

Login names and IDs live only in server.js (the USERS list). Edit there to change them.
