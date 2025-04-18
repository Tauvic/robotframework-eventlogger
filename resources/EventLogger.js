// *********************
// Author: Tauvic Ritter (https://github.com/Tauvic)
// Description: Event Logger for Robot Framework
// License: MIT License
// *********************

//const { BrowserContext, Page } = require('playwright');

/**
 * @typedef {object} RequestData
 * @property {number} requestID
 * @property {string} method
 * @property {string} resourceType
 * @property {string} url
 * @property {string | null} postData
 * @property {string | null} failure
 */

/**
 * @typedef {object} ResponseData
 * @property {number} status
 * @property {string} statusText
 * @property {boolean} ok
 * @property {string | null} content
 */

/**
 * @typedef {object} EventLogEntry
 * @property {Date} time
 * @property {string} event
 * @property {string} type
 * @property {any} data
 */

/**
 * @typedef {object} ContextData
 * @property {string | null} alerts
 * @property {number} requestID
 * @property {Set<number>} activeRequests
 * @property {number} lastEventTime
 * @property {number} maxWait
 * @property {number} minIdle
 * @property {Promise<{resolve: (value?: any) => void, reject: (reason?: any) => void} | null>} waitPromise
 * @property {NodeJS.Timeout | null} waitIdle
 * @property {NodeJS.Timeout | null} waitTimeout
 * @property {EventLogEntry[]} events
 */

/**
 * Initializes the event logger.
 * @param {number} [maxWait=10000] - The maximum wait time for events.
 * @param {number} [minIdle=150] - The minimum idle time for network requests.
 * @param {string | null} [alerts=null] - The XPath for alert elements.
 * @param {BrowserContext} context - The Playwright BrowserContext.
 * @param {function} logger - The logger function.
 * @returns {Promise<void>}
 */
async function initEventLogger(
    maxWait = 10000,
    minIdle = 150,
    alerts = null,
    context,
    logger
) {
    // Initialize Event Logger
    // Call directly after browser context is created
    // This function only refers to the browser context
    // add event handlers to log API and UI events:
    //   API requests and responses
    //   API request failures
    //  Dom changes (used for alerts, warnings, info messages, toast messages)
    //  Console messages

    if ('req' in context) {
        //Prevent running this twice
        //We assume that the context is not reused in the same test
        logger(`Init API Requests called twice !! `);
        throw new Error("Init API Requests called twice !!");
    }

    logger(`init Event Logger start`);

    // create data structure to store results in context
    /** @type {ContextData} */
    context['req'] = {
        alerts: alerts,          // alerts to check for
        requestID: 0,           // request ID to check for
        activeRequests: new Set(),  // active requests to check for
        lastEventTime: 0,        // last event time to check for
        maxWait: maxWait,         // maximum wait time to check for events
        minIdle: minIdle,         // minimum idle time to check for events
        waitPromise: null,
        waitIdle: null,
        waitTimeout: null,
        events: []
    };

    await context.addInitScript(context => {

        console.info('addInitScript');

        // create a new instance of `MutationObserver` named `observer`,
        const observer = new MutationObserver((mutations) => {

            // class = toast-container success error warning
            //| Type             | Elements   |
            //| ---------------- | ---------- |
            //| Snackbar/Toast   | `<snack-bar-container>`, `<mat-snack-bar-container>`, `.mat-snack-bar-container`, `.toast`, `.snackbar` |
            //| Dialog/Modal     | `<mat-dialog-container>`, `.mat-dialog-container`, `<dialog>`, `.modal`, custom selectors like `<my-dialog>` |
            //| Alert banner     | `<div class="alert">`, `<div class="alert-success">`, `<div class="alert-danger">`, `<mat-error>`,`<mat-alert>` |
            //| Inline error     | `<mat-error>`, `<span class="error">`, `<div class="form-error">` |            

            function getMsgType(node) {
                const classProp = node.className;
                if (!classProp) return;
                switch (true) {
                    case classProp.includes('alert'):
                      return 'alert';
                    case classProp.includes('toast'):
                      return 'toast';
                    case classProp.includes('snack'):
                      return 'snack';                      
                }
            }

            function getMsgClass(node){
                const classProp = node.className;
                if (!classProp) return;                
                switch (true) {
                    case classProp.includes('info'):
                        return('info');
                    case classProp.includes('success'):
                        return('success');                        
                    case classProp.includes('warning'):
                        return('warning');
                    case classProp.includes('error'):
                        return('error');                        
                    case classProp.includes('danger'):
                        return('danger');  
                }                
            }

            for (const mutation of mutations) {

                switch(mutation.type) {
                    case 'childList':
                        for (const node of mutation.addedNodes) {
                            console.info(`Element ${node.tagName} ${node.className}`);
                            const msgType = getMsgType(node);
                            if (!msgType) return;                     
                            const msgClass = getMsgClass(node); 
                            console.info(`Message: add type=${msgType} class=${msgClass} ${node.innerText}`);
                        };
                        for (const node of mutation.removedNodes) {
                            console.info(`Element ${node.tagName} ${node.className}`);
                            const msgType = getMsgType(node);
                            if (!msgType) return;                     
                            const msgClass = getMsgClass(node);   
                            console.info(`Message: del type=${msgType} class=${msgClass} ${node.innerText}`);
                        };
                        break;   
                    case "attributes":
                        console.info(mutation.target.tagName,'attributes');
                        break;
                    case "characterData":                     
                        console.info(mutation.target.tagName,'characterData');
                        break;
                }
            }

            const result = window.document.evaluate(
                "//div[contains(@class, 'alert') or contains(@class, 'error') or contains(@class, 'toastr') or contains(@class, 'snack')] | //mat-error | //mat-alert",
                window.document,
                null,
                XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
                null,
                null,
            );

            for (let i = 0; i < result.snapshotLength; i++) {
                node = result.snapshotItem(i);
                console.warn(`node=${node.localName} class=${node.className} text=${node.innerText}`);
            }

        }, context);

        // call `observe()`, passing it the element to observe, and the options object
        observer.observe(window.document, {
            subtree: true,
            childList: true,
        });

    }, context);

    // listen for requests
    context.on('request', request => {
        if (request.resourceType() === 'xhr') {

            /** @type {ContextData} */
            const req = context.req;

            req.requestID += 1;
            request.requestID = req.requestID;
            req.activeRequests.add(request.requestID);
            req.lastEventTime = Date.now();

            let content = request.postDataJSON() || request.postData();
            if (content) content = JSON.stringify(content, null, 2);

            /** @type {RequestData} */
            const rqd = {
                requestID: request.requestID,
                method: request.method(),
                resourceType: request.resourceType(),
                url: request.url(),
                postData: content,
                failure: null,
            }

            req.events.push({ 'time': new Date(), 'event': 'request', 'type': 'INFO', 'data': rqd });
            //req.events.push({ 'time': new Date(), 'event': 'console', 'type': 'DEBUG', 'data': `waitIdle size=${req.activeRequests.size} promise=${req.waitPromise} id=${req.waitIdle}` });
            if (req.waitIdle) {
                //req.events.push({ 'time': new Date(), 'event': 'console', 'type': 'DEBUG', 'data': `clear waitIdle id=${req.waitIdle}` });
                clearTimeout(context.req.waitIdle);
                req.waitIdle = null;
            }
        }
    });

    // listen for requests failed
    context.on('requestfailed', request => {
        if (request.resourceType() === 'xhr') {
            /** @type {ContextData} */
            const req = context.req;
            req.activeRequests.delete(request.requestID);
            req.lastEventTime = Date.now();

            let content = request.postDataJSON() || request.postData();
            if (content) content = JSON.stringify(content, null, 2);

            /** @type {RequestData} */
            const rqd = {
                requestID: request.requestID,
                method: request.method(),
                resourceType: request.resourceType(),
                url: request.url(),
                postData: content,
                failure: request.failure().errorText,
            }

            req.events.push({ 'time': new Date(), 'event': 'request', 'type': 'WARN', 'data': rqd });
            //req.events.push({ 'time': new Date(), 'event': 'console', 'type': 'DEBUG', 'data': `waitIdle size=${req.activeRequests.size} promise=${req.waitPromise}` });
            if (req.activeRequests.size === 0 && context.req.waitPromise) {
                req.waitIdle = setTimeout(req.waitPromise.resolve, req.minIdle);
                //req.events.push({ 'time': new Date(), 'event': 'console', 'type': 'DEBUG', 'data': `set waitIdle id=${req.waitIdle} time=${req.minIdle}`  });
            }
        }
    });

    // listen for responses finished
    context.on('requestfinished', async request => {
        if (request.resourceType() === 'xhr') {
            /** @type {ContextData} */
            const req = context.req

            req.activeRequests.delete(request.requestID);
            req.lastEventTime = Date.now();

            let content = request.postDataJSON() || request.postData();
            if (content) content = JSON.stringify(content, null, 2);            

            /** @type {RequestData} */
            const rqd = {
                requestID: request.requestID,
                method: request.method(),
                resourceType: request.resourceType(),
                url: request.url(),
                postData: content,
                failure: null
            }

            const resp = await request.response()
            content = null;

            try {
                content = await resp.json();
                content = JSON.stringify(content, null, 2);
            } catch (ex) {
                try {
                    content = await resp.text();
                }
                catch (ex) {
                    content = null;
                }
            }


            /** @type {ResponseData} */
            const rsd = {
                status: resp.status(),
                statusText: resp.statusText(),
                ok: resp.ok(),
                content: content
            }
            req.events.push({ 'time': new Date(), 'event': 'response', 'type': 'INFO', 'data': [rqd,rsd] });
            //req.events.push({ 'time': new Date(), 'event': 'console', 'type': 'DEBUG', 'data': `waitIdle size=${req.activeRequests.size} promise=${req.waitPromise}` });
            if (req.activeRequests.size === 0 && context.req.waitPromise) {
                req.waitIdle = setTimeout(req.waitPromise.resolve, req.minIdle);
                //req.events.push({ 'time': new Date(), 'event': 'console', 'type': 'DEBUG', 'data': `set waitIdle id=${req.waitIdle} time=${req.minIdle}`  });
            }

        }
    });


    // listen for console messages
    context.on('console', async (message) => {
        /** @type {ContextData} */
        const req = context.req;

        if (message.text() != "JSHandle@error") {
            req.events.push({ 'time': new Date(), 'event': 'console', 'type': message.type().toUpperCase(), 'data': message.text() });
            return;
        };

        const messages = await Promise.all(message.args().map((arg) => {
            return arg.getProperty("message");
        }));

        msg = `${messages}`
        req.events.push({ 'time': new Date(), 'event': 'console', 'type': message.type().toUpperCase(), 'data': msg });
    });

    context.on('page', page => {
        context.req.events.push({ 'time': new Date(), 'event': 'console', 'type': 'INFO', 'data': `New page created: ${page.url()}` });
        page.on('framenavigated', frame => {
            context.req.events.push({ 'time': new Date(), 'event': 'console', 'type': 'INFO', 'data': `Frame navigated: ${frame.url()}` });
        });
        page.on('pageerror', data => {
            context.req.events.push({ 'time': new Date(), 'event': 'console', 'type': 'ERROR', 'data': data.message });
        });
    });

    logger(`init Event Logger finish`);
}

async function checkAlerts(context, page, path, timeout = 100) {

    //context.req.events.push({ 'time': new Date(), 'event': 'console', 'type': 'DEBUG', 'data': 'check Alerts' });

    try {
        await page.locator(path).waitFor({ state: 'visible', timeout: timeout });
    } catch (error) {
        return; // Ignore timeout errors
    }

    const elements = await page.locator(path).all();
    if (elements && elements.length > 0) {
        const texts = [];
        for (const element of elements) {
            texts.push(await element.innerText());
        }
        throw new Error(texts.join(", "));
    }
}

/**
 * Wait for all active requests to finish and for the minimum idle time to pass.
 * @param {ContextData} req
 */
function waitPromise(req) {

    return new Promise((resolve, reject) => {

        // share this promise with the request handler
        // so that we can resolve it when all requests are done
        req.waitPromise = { resolve, reject };

        const waiting = req.activeRequests.size;      // Number of requests in flight
        const idle = Date.now() - req.lastEventTime;  // Time since last event

        //req.events.push({ 'time': new Date(), 'event': 'console', 'type': 'DEBUG', 'data': `wait Started waiting=${waiting} idle=${idle}` });

        if (waiting === 0) {
            if (idle > req.minIdle) {
                //req.events.push({ 'time': new Date(), 'event': 'console', 'type': 'DEBUG', 'data': `wait Resolve` });
                resolve();
                return;
            }
            else {
                req.waitIdle = setTimeout(resolve, req.minIdle - idle);
                //req.events.push({ 'time': new Date(), 'event': 'console', 'type': 'DEBUG', 'data': `wait set id=${req.waitIdle} time=${req.minIdle - idle}` });
            }
        }

        req.waitTimeout = setTimeout(() => {
            reject(new Error(`waitForApiEvents: Max wait time of ${req.maxWait}ms exceeded outstanding=${[...req.activeRequests].join(',')} id=${req.waitTimeout}`));
        }, req.maxWait);
        //req.events.push({ 'time': new Date(), 'event': 'console', 'type': 'DEBUG', 'data': `set waitTimeout id=${req.waitTimeout} time=${req.maxWait}` });

    });

}

// Wait for all outstanding events
async function waitForEvents(context, page, logger) {

    const req = context.req;
    if (!req) return;
    const startTime = new Date();

    // Wait for all events that we expect to happen
    try {
        // Check for alerts first because no need to wait for API events if we fail on alerts
        if (req.alerts) await checkAlerts(context, page, path = req.alerts);

        const startPromise = Date.now()

        await waitPromise(req);

        req.waitPromise = null;

        if (req.waitIdle) {
            //req.events.push({ 'time': new Date(), 'event': 'console', 'type': 'DEBUG', 'data': `clear waitIdle id=${req.waitIdle}` });
            clearTimeout(req.waitIdle);
            req.waitIdle = null;
        }

        if (req.waitTimeout) {
            //req.events.push({ 'time': new Date(), 'event': 'console', 'type': 'DEBUG', 'data': `clear waitTimeout id=${req.waitTimeout}` });
            clearTimeout(req.waitTimeout);
            req.waitTimeout = null;
        }

        //req.events.push({ 'time': new Date(), 'event': 'console', 'type': 'DEBUG', 'data': `wait End delta=${Date.now()-startPromise}` });
        // Check for alerts again after all API responses have been processed
        if (req.alerts) await checkAlerts(context, page, path = req.alerts);
    } catch (error) {
        // usually an alert or timeout error
        req.events.push({ 'time': new Date(), 'event': 'console', 'type': 'ERROR', 'data': error });
        throw error;
    }

    const endTime = new Date();
    const delta = endTime - startTime;

    req.events.push({ 'time': endTime, 'event': 'console', 'type': 'INFO', 'data': `Wait satisfied in ${delta} ms` });
}

async function reportEvents(context, logger) {

    if (!('req' in context)) return;

    // Return raw event data as JSON
    return context.req.events.map(ev => ({
        time: ev.time.toISOString(),
        event: ev.event,
        type: ev.type,
        data: ev.data
    }));
}

initEventLogger.rfdoc = `
Init Event Logger https://api.practicesoftwaretesting.com
.`

waitForEvents.rfdoc = `
Wait for Events.
.`

reportEvents.rfdoc = `
Report Events.
.`

exports.__esModule = true;
exports.initEventLogger = initEventLogger;
exports.waitForEvents = waitForEvents;
exports.reportEvents = reportEvents;
