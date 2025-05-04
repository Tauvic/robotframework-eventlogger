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
 * @property {Number} time
 * @property {string} context
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
 * @property {string | null} context
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

    logger(`init Event Logger start`);

    if ('cfg' in context) {
        //Prevent running this twice
        //We assume that the context is not reused in the same test
        logger(`Init API Requests called twice !! `);
        throw new Error("Init API Requests called twice !!");
    }

    // create data structure to store results in context
    /** @type {ContextData} */
    context['cfg'] = {
        // alert handling
        alerts: alerts,             // alerts to check for
        // request/response handling
        requestID: 0,               // request ID
        activeRequests: new Set(),  // active requests to check for
        lastEventTime: 0,           // last time a request/response was received
        maxWait: maxWait,           // maximum wait time to check for events
        minIdle: minIdle,           // minimum idle time to check for events
        waitPromise: null,
        waitIdle: 0,                // id of idle timer
        waitTimeout: 0,             // id of timeout timer  
        events: []                  // array to store events  
    };

    context.addInitScript(() => {

        // This script runs on a page in the browser, not in the Node.js context, so context does not work here
        // We use MutationObserver to monitor DOM changes and classify them as alerts or toasts

        alerts = {};
        alertID = 0;
        alertTimer = null;

        function isGenerallyVisible(element) {
            const style = window.getComputedStyle(element)
            return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0'
        }

        function isVisibleInViewport(element) {
            const rect = element.getBoundingClientRect()
            return (
                rect.top >= 0 &&
                rect.left >= 0 &&
                rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
                rect.right <= (window.innerWidth || document.documentElement.clientWidth)
            )
        }    
        
        function isElementFullyVisible(element) {
            return isGenerallyVisible(element) && isVisibleInViewport(element) && element.checkVisibility()
        }

        function updateStatus(alertID) {       

            const alertData = alerts[alertID];
            const wasVisible = alertData.visible;
            const isVisible = isElementFullyVisible(alertData.node);

            if (wasVisible == true) {
                const delta = Date.now()-alertData.updated;
                alertData.shown += delta; // update the shown time
            }

            alertData.visible = isVisible; // update the visibility status
            alertData.updated = Date.now(); // update the last updated time

            if (isVisible !== wasVisible) console.debug(`Alert: Updated`,alertData);
        }

        function classify(node) {

            //TO-DO: check for aria role

            const className = node.className;
            // find the word alert or toast
            const isAlert = /\balert\b/;
            const alertType = /\balert-(success|info|warning|error|danger)\b/g
            const isToast = /\b(toast|ngx-toastr)\b/;
            const toastType = /\btoast-(success|info|warning|error|danger)\b/g
            
            let   msgType = null;                    
            let   msgClass= null;
            let   msgTitle= null;
            let   msgText = null;    
                
            if (isAlert.test(className)) {
                const match = className.match(alertType);
                if (match && match.length===1) {
                    msgType  = 'alert'
                    msgClass = match[0]
                    msgText  = node.innerText.trim()
                }                  
            } else if (isToast.test(className)) {
                const match = className.match(toastType)
                if (match && match.length===1) {
                    msgType  = 'toast'
                    msgClass = match[0]
                    const titleNode = node.querySelector(".toast-title");
                    if (titleNode) {
                    msgTitle = titleNode.innerText.trim();
                    const msgNode = node.querySelector(".toast-message");
                    msgText = msgNode.innerText.trim();

                    } else
                    msgText  = node.innerText.trim()
                }      
            }

            if (!msgType) {
                node.dataset.alertID = null; // classify as not an alert
                return;
            }

            const newID = ++alertID;
            node.dataset.alertID = newID; // store the alert ID in the node
            
            const alertData = {alert: newID, 
                            class: msgClass,                            
                            visible:isElementFullyVisible(node),
                            shown: 0,
                            text: msgText,                                    
                            title: msgTitle,                           
                            type: msgType,
                            node:node,
                            updated: Date.now()};

            alerts[newID] = alertData; // store the alert in the alerts array

            console.debug('Alert: Created',alertData);

            if (Object.keys(alerts).length === 1) {
                alertTimer = setInterval(() => {

                    for (const [alertID, alertData] of Object.entries(alerts)) {
                        if (document.body.contains(alertData.node)) {
                            updateStatus(alertID);
                        } else {
                            delete alerts[alertID]; // remove the alert from the alerts array
                            console.debug(`Alert: Removed left=[${Object.keys(alerts)}]`,alertData);
                        }
                    };

                    if (Object.keys(alerts).length === 0) {
                        clearInterval(alertTimer); // stop the timer if there are no alerts
                        alertTimer = null;
                        console.debug(`Alert: Cleared all alerts`);
                    }
                }, 50); // check every 50ms
            }
        }

        function checkNode(node) {

            // check if node is element and has className
            if (!node || node.nodeType !== Node.ELEMENT_NODE || !node.className) return;                 

            const alertID = node.dataset?.alertID

            // alertID is set when the node is classified as an alert
            if (alertID > 0) {
                updateStatus(alertID);
            } else if (alertID === undefined) {
                classify(node); // classify the node as an alert or not set the alertID to null
            }

        }        

        // create a new instance of `MutationObserver` named `observer`,
        const observer = new MutationObserver((mutations) => {

            // for each mutation in the array of mutations passed to the callback function
            for (const mutation of mutations) {

                checkNode(mutation.target);

                switch(mutation.type) {
                    case 'childList':
                        for (const node of mutation.addedNodes) {
                            checkNode(node);
                        };
                        for (const node of mutation.removedNodes) {
                            checkNode(node);
                        };
                        break;   
                    case "attributes":
                        break;
                    case "characterData":                     
                        break;
                }
            }

        });

        // call `observe()`, passing it the element to observe, and the options object
        observer.observe(window.document, {
            subtree: true,
            childList: true
        });

    });

    // listen for requests
    context.on('request', request => {
        /** @type {ContextData} */
        const cfg = context.cfg;
        const url = new URL(request.url());

        if (['xhr','fetch'].includes(request.resourceType()) && url.hostname.includes(cfg.hostname)) {

            cfg.requestID += 1;
            request.requestID = cfg.requestID;
            cfg.activeRequests.add(request.requestID);
            cfg.lastEventTime = Date.now();

            const methodsWithBody = ['POST', 'PUT', 'PATCH'];
            const requestMethod = request.method();
            let content = null;

            // Check if the request method is one of the methods that can have a body
            if (methodsWithBody.includes(requestMethod)) {
                const contentType = request.headers()['content-type'];
                if (contentType && contentType.includes('application/json')) {
                  // Attempt to parse the post data as JSON to confirm
                  content = request.postDataJSON();
                  if (content) content = JSON.stringify(content, null, 2);
                } else {
                  // If not JSON, use the raw post data
                  content = request.postData();
                }
            }

            /** @type {RequestData} */
            const rqd = {
                requestID: request.requestID,
                method: requestMethod,
                resourceType: request.resourceType(),
                url: request.url(),
                postData: content,
                failure: null,
            }

            cfg.events.push({ time: Date.now(), event: 'request', 'type': 'INFO', data: rqd });
            //cfg.events.push({ 'time': Date.now(), 'event': 'console', 'type': 'DEBUG', 'data': `waitIdle size=${cfg.activeRequests.size} promise=${cfg.waitPromise} id=${cfg.waitIdle}` });
            if (cfg.waitIdle) {
                //cfg.events.push({ 'time': Date.now(), 'event': 'console', 'type': 'DEBUG', 'data': `clear waitIdle id=${cfg.waitIdle}` });
                clearTimeout(context.cfg.waitIdle);
                cfg.waitIdle = null;
            }
        } 
    });

    // listen for requests failed
    context.on('requestfailed', request => {

        /** @type {ContextData} */
        const cfg = context.cfg;

        if (cfg.activeRequests.has(request.requestID)) {

            cfg.activeRequests.delete(request.requestID);
            cfg.lastEventTime = Date.now();

            const methodsWithBody = ['POST', 'PUT', 'PATCH'];
            const requestMethod = request.method();
            let content = null;

            // Check if the request method is one of the methods that can have a body
            if (methodsWithBody.includes(requestMethod)) {
                const contentType = request.headers()['content-type'];
                if (contentType && contentType.includes('application/json')) {
                  // Attempt to parse the post data as JSON to confirm
                  content = request.postDataJSON();
                  if (content) content = JSON.stringify(content, null, 2);
                } else {
                  // If not JSON, use the raw post data
                  content = request.postData();
                }
            }

            /** @type {RequestData} */
            const rqd = {
                requestID: request.requestID,
                method: requestMethod,
                resourceType: request.resourceType(),
                url: request.url(),
                postData: content,
                failure: request.failure().errorText,
            }

            cfg.events.push({ time: Date.now(), event: 'request', type: 'WARN', data: rqd });
            //cfg.events.push({ 'time': Date.now(), 'event': 'console', 'type': 'DEBUG', 'data': `waitIdle size=${cfg.activeRequests.size} promise=${cfg.waitPromise}` });
            if (cfg.activeRequests.size === 0 && context.cfg.waitPromise) {
                cfg.waitIdle = setTimeout(cfg.waitPromise.resolve, cfg.minIdle);
                //cfg.events.push({ 'time': Date.now(), 'event': 'console', 'type': 'DEBUG', 'data': `set waitIdle id=${cfg.waitIdle} time=${cfg.minIdle}`  });
            }
        }
    });

    // listen for responses finished
    context.on('requestfinished', async request => {

        /** @type {ContextData} */
        const cfg = context.cfg;

        if (cfg.activeRequests.has(request.requestID)) {

            cfg.activeRequests.delete(request.requestID);
            cfg.lastEventTime = Date.now();

            const methodsWithBody = ['POST', 'PUT', 'PATCH'];
            const requestMethod = request.method();
            let content = null;

            // Check if the request method is one of the methods that can have a body
            if (methodsWithBody.includes(requestMethod)) {
                const contentType = request.headers()['content-type'];
                if (contentType && contentType.includes('application/json')) {
                  // Attempt to parse the post data as JSON to confirm
                  content = request.postDataJSON();
                  if (content) content = JSON.stringify(content, null, 2);
                } else {
                  // If not JSON, use the raw post data
                  content = request.postData();
                }
            } 

            /** @type {RequestData} */
            const rqd = {
                requestID: request.requestID,
                method: requestMethod,
                resourceType: request.resourceType(),
                url: request.url(),
                postData: content,
                failure: null
            }

            const resp = await request.response();
            const contentType = resp.headers()['content-type'];
            content = null;

            try {
                if (contentType && contentType.includes('application/json')) {
                    content = await resp.json();
                    content = JSON.stringify(content, null, 2);
                } else {
                    // If not JSON, use the raw post data
                    content = await resp.text();    
                }    
            } catch (error) {
                cfg.events.push({ time: Date.now(), event: 'console', type: 'ERROR', data: error.toString() });
            }

            /** @type {ResponseData} */
            const rsd = {
                status: resp.status(),
                statusText: resp.statusText(),
                ok: resp.ok(),
                content: content
            }
            cfg.events.push({ time: Date.now(), event: 'response', type: 'INFO', data: [rqd,rsd] });
            //cfg.events.push({ 'time': Date.now(), 'event': 'console', 'type': 'DEBUG', 'data': `waitIdle size=${cfg.activeRequests.size} promise=${cfg.waitPromise}` });
            if (cfg.activeRequests.size === 0 && context.cfg.waitPromise) {
                cfg.waitIdle = setTimeout(cfg.waitPromise.resolve, cfg.minIdle);
                //cfg.events.push({ 'time': Date.now(), 'event': 'console', 'type': 'DEBUG', 'data': `set waitIdle id=${cfg.waitIdle} time=${cfg.minIdle}`  });
            }

        }
    });

    // listen for console messages
    context.on('console', async (message) => {
        /** @type {ContextData} */
        const cfg = context.cfg;

        if (message.text() != "JSHandle@error") {
            cfg.events.push({ time: Date.now(), event: 'console', type: message.type().toUpperCase(), data: message.text() });
            return;
        };

        const messages = await Promise.all(message.args().map((arg) => {
            return arg.getProperty("message");
        }));

        msg = `${messages}`
        cfg.events.push({ time: Date.now(), event: 'console', type: message.type().toUpperCase(), data: msg });
    });

    context.on('page', page => {

        page.on('framenavigated', async (frame) => {
            const url = page.url();
            // save hostname to context: used for checking api requests
            context.cfg.hostname = await page.evaluate(()=> {return location.hostname});;
            context.cfg.events.push({ time: Date.now(), event: 'console', type: 'INFO', data: `Navigated: url=${url}`, context: url });
        });

        page.on('pageerror', data => {
            context.cfg.events.push({ time: Date.now(), event: 'console', type: 'ERROR', data: data.message });
        });
    });

    logger(`init Event Logger finish`);
}

async function checkAlerts(page, path, timeout = 100) {

    //context.cfg.events.push({ 'time': Date.now(), 'event': 'console', 'type': 'DEBUG', 'data': 'check Alerts' });

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
 * @param {ContextData} cfg
 */
function waitPromise(cfg) {

    return new Promise((resolve, reject) => {

        // share this promise with the request handler
        // so that we can resolve it when all requests are done
        cfg.waitPromise = { resolve, reject };

        const waiting = cfg.activeRequests.size;      // Number of requests in flight
        const idle = Date.now() - cfg.lastEventTime;  // Time since last event

        //cfg.events.push({ 'time': Date.now(), 'event': 'console', 'type': 'DEBUG', 'data': `wait Started waiting=${waiting} idle=${idle}` });

        if (waiting === 0) {
            if (idle > cfg.minIdle) {
                //cfg.events.push({ 'time': Date.now(), 'event': 'console', 'type': 'DEBUG', 'data': `wait Resolve` });
                resolve();
                return;
            }
            else {
                cfg.waitIdle = setTimeout(resolve, cfg.minIdle - idle);
                //cfg.events.push({ 'time': Date.now(), 'event': 'console', 'type': 'DEBUG', 'data': `wait set id=${cfg.waitIdle} time=${cfg.minIdle - idle}` });
            }
        }

        cfg.waitTimeout = setTimeout(() => {
            reject(new Error(`waitForApiEvents: Max wait time of ${cfg.maxWait}ms exceeded outstanding=${[...cfg.activeRequests].join(',')} id=${cfg.waitTimeout}`));
        }, cfg.maxWait);
        //cfg.events.push({ 'time': Date.now(), 'event': 'console', 'type': 'DEBUG', 'data': `set waitTimeout id=${cfg.waitTimeout} time=${cfg.maxWait}` });

    });

}

// Wait for all outstanding events
async function waitForEvents(context, page) {

    const cfg = context.cfg;
    if (!cfg) return;
    const startTime = Date.now();

    // Wait for all events that we expect to happen
    try {
        // Check for alerts first because no need to wait for API events if we fail on alerts
        if (cfg.alerts) await checkAlerts(page, path = cfg.alerts);

        const startPromise = Date.now()

        await waitPromise(cfg);

        cfg.waitPromise = null;

        if (cfg.waitIdle) {
            //cfg.events.push({ 'time': Date.now(), 'event': 'console', 'type': 'DEBUG', 'data': `clear waitIdle id=${cfg.waitIdle}` });
            clearTimeout(cfg.waitIdle);
            cfg.waitIdle = null;
        }

        if (cfg.waitTimeout) {
            //cfg.events.push({ 'time': Date.now(), 'event': 'console', 'type': 'DEBUG', 'data': `clear waitTimeout id=${cfg.waitTimeout}` });
            clearTimeout(cfg.waitTimeout);
            cfg.waitTimeout = null;
        }

        //cfg.events.push({ 'time': Date.now(), 'event': 'console', 'type': 'DEBUG', 'data': `wait End delta=${Date.now()-startPromise}` });
        // Check for alerts again after all API responses have been processed
        if (cfg.alerts) await checkAlerts(page, path = cfg.alerts);
    } catch (error) {
        // usually an alert or timeout error
        cfg.events.push({ time: Date.now(), event: 'console', type: 'ERROR', data: error });
        throw error;
    }

    const endTime = Date.now();
    const delta = endTime - startTime;

    cfg.events.push({ time: endTime, event: 'console', type: 'DEBUG', data: `Wait satisfied in ${delta} ms` });
}

async function reportEvents(context) {

    if (!('cfg' in context)) return;

    return context.cfg.events;
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
