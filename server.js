#!/usr/bin/env node
'use strict';

const fs = require('fs');
const yaml = require('js-yaml');
const bs58 = require('bs58');
const crypto = require('crypto');
const bodyParser = require('body-parser');

// How we validate an email address. (As per HTML5)
const emailRe = /^[a-zA-Z0-9.!#$%&’*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/;
// How we validate a URI.
const uriRe = /^[a-zA-Z0-9\.\+\-]+:.*TOKEN.*$/;
// How we validate tokens.
const tokenRe = /^[a-zA-Z0-9]{21,22}$/;
// How we generate tokens.
const generateToken = () => bs58.encode(crypto.randomBytes(16));
// How long tokens are valid, in seconds.
const tokenLifespan = 3600;  // 1 hour

// Parse commandline and config.
const configFile = process.argv[2] || 'config.yml';
const config = yaml.safeLoad(fs.readFileSync(configFile, 'utf8'), {
    filename: configFile
});

// Setup service connections.
const redis = require('redis').createClient(config.redis);
const smtp = require('emailjs').server.connect(config.smtp);

// Create Express app.
const app = require('express')();

// New login API.
app.post('/login',
    bodyParser.urlencoded({
        extended: false,
        limit: '10kb'
    }),
    (req, res, next) => {
        if (!req.body.displayName)
            res.status(400).type('txt').send(`Invalid display name`);
        else if (!emailRe.test(req.body.email))
            res.status(400).type('txt').send(`Invalid email`);
        else if (!uriRe.test(req.body.redirectUri))
            res.status(400).type('txt').send(`Invalid redirect URI`);
        else
            next();
    },
    (req, res, next) => {
        const token = req.token = generateToken();
        redis.set(token, req.body.email, 'EX', tokenLifespan, next);
    },
    (req, res, next) => {
        const name = req.body.displayName;
        const uri = req.body.redirectUri.replace('TOKEN', req.token);
        smtp.send({
            from: config.from,
            to: req.body.email,
            subject: `Complete login to ${name}`,
            text: `Hello!\nComplete your login to ${name} by following this link:\n${uri}\n`
        }, next);
    },
    (req, res) => {
        res.status(204).end();
    }
);

// Verify a token API.
app.post('/verify',
    bodyParser.urlencoded({
        extended: false,
        limit: '1kb'
    }),
    (req, res, next) => {
        if (!tokenRe.test(req.body.token))
            res.status(400).type('txt').send(`Invalid token`);
        else
            next();
    },
    (req, res, next) => {
        const token = req.body.token;
        redis.multi()
            .get(token, (err, email) => req.email = email)
            .del(token)
            .exec(next);
    },
    (req, res) => {
        if (req.email)
            res.type('txt').send(req.email);
        else
            res.status(404).type('txt').send(`Token not found`);
    }
);

// Start listening.
app.listen(process.env.PORT || 8080);
