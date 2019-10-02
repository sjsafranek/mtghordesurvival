# mtghordesurvival


## Description
A simple web application that runs the Horde Survival format for Magic The Gathering. It uses the ScryFall API to pull card images and data.

Uses the deck list from:

 - [Zombies](https://www.quietspeculation.com/2011/09/horde-magic-a-new-way-to-play-magic-and-survive-zombie-invasions/)

 - [13 Demon Lords](https://www.mtgvault.com/thesilenttaco/decks/horde-the-13-demon-lords/)


## Installation
No installation is required. This app can be run running it on any HTTP server (Apache, NGINX, etc.) or by running the included simpleserver.go script provided.


### Simple HTTP server
Python comes with a built in http server. Examples:

 - python2 -m SimpleHTTPServer [port]

 - python3 -m http.server
