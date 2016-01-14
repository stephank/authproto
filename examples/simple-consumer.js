#!/usr/bin/env node
'use strict';

const request = require('request');
const bodyParser = require('body-parser');

// Our own URL, to build redirects.
const originUrl = 'http://localhost:8081';
// Auth service URL.
const serviceUrl = 'http://localhost:8080';
// Display name used during auth.
const displayName = 'Example';

// How we validate an email address. (As per HTML5)
const emailRe = /^[a-zA-Z0-9.!#$%&’*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/;
// How we validate tokens.
const tokenRe = /^[a-zA-Z0-9]{21,22}$/;

// Create Express app.
const app = require('express')();

// Landing page with login form.
app.get('/',
    (req, res) => {
        res.send(`
            <form method="POST" action="/startlogin">
                <input type="email" name="email" placeholder="Your email address">
                <button type="submit">Login</button>
            </form>
        `);
    }
);

// Submit login.
app.post('/startlogin',
    bodyParser.urlencoded({
        extended: false,
        limit: '1kb'
    }),
    (req, res, next) => {
        if (!emailRe.test(req.body.email))
            res.status(400).send(`Invalid email`);
        else
            next();
    },
    (req, res, next) => {
        const email = req.body.email;
        const redirectUri = originUrl + '/completelogin/TOKEN';
        request.post(serviceUrl + '/login', {
            form: { displayName, email, redirectUri }
        }, (err, res) => {
            if (!err) {
                if (res.statusCode !== 204)
                    err = Error(`Could not initiate auth, status code ${res.statusCode}`);
            }
            next(err);
        });
    },
    (req, res) => {
        res.send(`Check your email for a special link to complete your login.`);
    }
);

// Complete login.
app.get('/completelogin/:token',
    (req, res, next) => {
        if (!tokenRe.test(req.params.token))
            res.status(400).send(`Invalid token`);
        else
            next();
    },
    (req, res, next) => {
        request.post(serviceUrl + '/verify', {
            form: { token: req.params.token }
        }, (err, res, body) => {
            if (!err) {
                if (res.statusCode === 404)
                    req.email = null;
                else if (res.statusCode !== 200)
                    err = Error(`Could not complete auth, status code ${res.statusCode}`);
                else
                    req.email = body;
            }
            next(err);
        });
    },
    (req, res) => {
        if (req.email)
            res.send(`Welcome ${req.email}!`);
        else
            res.send(`The link is invalid or expired`);
    }
);

// Start listening.
app.listen(process.env.PORT || 8081);
