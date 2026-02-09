# Demo

Hello! As of when this page was created, there is no public demo for this piece of software. I've chosen to do this out of a risk of abuse.

Instead, you can use community instances of CTFd (e.g. CTF practice instances or your school's instance) OR set up an environment to use ctfd-autorouter using only a few commands.

## Requirement: CTFd

This program depends on accessing a web application called [CTFd](//github.com/CTFd/CTFd). This daemon is required to be running on an accessible web address (e.g. someone's server, or localhost) to be able to access challenges you/others put on it.

As a public CTFd instance for testers to use may be abused, I've chosen to require testers to either use their own servers or the [public demo instance of CTFd](https://demo.ctfd.io/) (which resets every 30min).

### Installing CTFd

CTFd is a daemon and must be running for this program to work. You can spin it up quickly with docker by running the following commands:

```bash
git clone https://github.com/CTFd/CTFd.git
cd CTFd
docker compose up -d
```

As this docker configuration is set to restart, it will continue running on your computer after you're done testing. To stop the instance, run `docker compose down` in the `CTFd` directory. 

It'll listen on port 80 and requires web configuration to get going. Sorry :(<br/>
Have a nice time playing with it though!

## Installing ctfd-autorouter

Check the [usage section in the README](README.md#usage) for instructions.

# Demo Video

If you are unable to test the software, a video has been provided to explain all the features of this tool. Access it [here](https://user-cdn.hackclub-assets.com/019c4277-6bfe-76e6-b474-718e4c161169/demo.webm). 