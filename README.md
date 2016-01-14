# Simple Auth Service Prototype

This is a simple service that verifies just an email address by sending a
special link. It's a bit like a federated http://passwordless.net/.

It's ridiculously simple, and mostly just to demonstrate an idea and maybe
serve as a starting point.

There's no proof that any of this is secure!

## Usage

`server.js` is the auth service HTTP server, and `examples/simple-consumer.js`
is a simple web app using the auth service.

`server.js` looks for `config.yml`, which you need to create based on the
provided `config.yml.sample`.

Then just run both the servers, and go to http://localhost:8081/ to get to
the login form.
