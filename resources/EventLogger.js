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

    if ('cfg' in context) {
        //Prevent running this twice
        //We assume that the context is not reused in the same test
        logger(`Init API Requests called twice !! `);
        throw new Error("Init API Requests called twice !!");
    }

    logger(`init Event Logger start`);

    // create data structure to store results in context
    /** @type {ContextData} */
    context['cfg'] = {
        alerts: alerts,             // alerts to check for
        requestID: 0,               // request ID to check for
        activeRequests: new Set(),  // active requests to check for
        lastEventTime: 0,           // last event time to check for
        maxWait: maxWait,           // maximum wait time to check for events
        minIdle: minIdle,           // minimum idle time to check for events
        waitPromise: null,
        waitIdle: null,
        waitTimeout: null,
        events: []
    };

    await context.addInitScript(context => {

        // This script runs in the browser context, not in the Node.js context, so context does not work here
        // This is where we will observe DOM changes and log them

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

        function showStatus(alertData) {
            const wasVisible = alertData.visible;
            const isVisible = isElementFullyVisible(alertData.node);
            
            if (isVisible === wasVisible) return; // no change in visibility

            alertData.visible = isVisible; // update the visibility status
            const delta = Date.now()-alertData.updated;

            if (isVisible === false && wasVisible == true) {
                alertData.shown += delta; // update the shown time
            }
            console.info(`Alert: Updated`,alertData);
            alertData.updated = Date.now(); // update the last updated time
        
        }

        alerts = {};
        alertID = 0;
        alertTimer = null;

        // create a new instance of `MutationObserver` named `observer`,
        const observer = new MutationObserver((mutations) => {
      
            function checkNode(cause, node) {

                let alertData = {}

                // check if element has not already been identified as an alert
                if (!node.dataset?.alertID) {

                    // this node may be a new alert

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

                    if (!msgType) return; // return if it is not an alert

                    const newID = ++alertID;
                    alertData = {alert: newID, 
                                 class: msgClass,                            
                                 visible:isElementFullyVisible(node),
                                 shown: 0,
                                 text: msgText,                                    
                                 title: msgTitle,                           
                                 type: msgType,
                                 node:node,
                                 updated: Date.now()};
                    node.dataset.alertID = newID;
                    alerts[newID] = alertData; // store the alert in the alerts array
    
                    console.info('Alert: Created',alertData);

                    if (Object.keys(alerts).length === 1) {
                        alertTimer = setInterval(() => {

                            for (const [alertId, alertData] of Object.entries(alerts)) {
                                if (document.body.contains(alertData.node)) {
                                    showStatus(alertData);
                                } else {
                                    delete alerts[alertId]; // remove the alert from the alerts array
                                    console.info(`Alert: Removed left=[${Object.keys(alerts)}]`,alertData);
                                }

                            };

                            if (Object.keys(alerts).length === 0) {
                                clearInterval(alertTimer); // stop the timer if there are no alerts
                                alertTimer = null;
                                console.info(`Alert: Cleared all alerts`);
                            }
                        }, 50); // check every 50ms
                    }
    
                } else {
                    alertData = alerts[node.dataset.alertID]
                    showStatus(alertData);
                }

                //console.error(`Message: ${cause} type=${alertData.type} class=${alertData.class} visible=${alertData.visible} title=${alertData.title} text=${alertData.text}`);
            }

            for (const mutation of mutations) {

                const node = mutation.target
                checkNode('Target',node);

                switch(mutation.type) {
                    case 'childList':
                        for (const node of mutation.addedNodes) {
                            checkNode('Create',node);
                        };
                        for (const node of mutation.removedNodes) {
                            checkNode('Remove',node);
                        };
                        break;   
                    case "attributes":
                        break;
                    case "characterData":                     
                        break;
                }
            }

        }, context);

        // call `observe()`, passing it the element to observe, and the options object
        observer.observe(window.document, {
            subtree: true,
            childList: true
        });

    }, context);

    // listen for requests
    context.on('request', request => {
        if (request.resourceType() === 'xhr') {

            /** @type {ContextData} */
            const cfg = context.cfg;

            cfg.requestID += 1;
            request.requestID = cfg.requestID;
            cfg.activeRequests.add(request.requestID);
            cfg.lastEventTime = Date.now();

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

            cfg.events.push({ 'time': new Date(), 'event': 'request', 'type': 'INFO', 'data': rqd });
            //cfg.events.push({ 'time': new Date(), 'event': 'console', 'type': 'DEBUG', 'data': `waitIdle size=${cfg.activeRequests.size} promise=${cfg.waitPromise} id=${cfg.waitIdle}` });
            if (cfg.waitIdle) {
                //cfg.events.push({ 'time': new Date(), 'event': 'console', 'type': 'DEBUG', 'data': `clear waitIdle id=${cfg.waitIdle}` });
                clearTimeout(context.cfg.waitIdle);
                cfg.waitIdle = null;
            }
        }
    });

    // listen for requests failed
    context.on('requestfailed', request => {
        if (request.resourceType() === 'xhr') {
            /** @type {ContextData} */
            const cfg = context.cfg;
            cfg.activeRequests.delete(request.requestID);
            cfg.lastEventTime = Date.now();

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

            cfg.events.push({ 'time': new Date(), 'event': 'request', 'type': 'WARN', 'data': rqd });
            //cfg.events.push({ 'time': new Date(), 'event': 'console', 'type': 'DEBUG', 'data': `waitIdle size=${cfg.activeRequests.size} promise=${cfg.waitPromise}` });
            if (cfg.activeRequests.size === 0 && context.cfg.waitPromise) {
                cfg.waitIdle = setTimeout(cfg.waitPromise.resolve, cfg.minIdle);
                //cfg.events.push({ 'time': new Date(), 'event': 'console', 'type': 'DEBUG', 'data': `set waitIdle id=${cfg.waitIdle} time=${cfg.minIdle}`  });
            }
        }
    });

    // listen for responses finished
    context.on('requestfinished', async request => {
        if (request.resourceType() === 'xhr') {
            /** @type {ContextData} */
            const cfg = context.cfg

            cfg.activeRequests.delete(request.requestID);
            cfg.lastEventTime = Date.now();

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
            cfg.events.push({ 'time': new Date(), 'event': 'response', 'type': 'INFO', 'data': [rqd,rsd] });
            //cfg.events.push({ 'time': new Date(), 'event': 'console', 'type': 'DEBUG', 'data': `waitIdle size=${cfg.activeRequests.size} promise=${cfg.waitPromise}` });
            if (cfg.activeRequests.size === 0 && context.cfg.waitPromise) {
                cfg.waitIdle = setTimeout(cfg.waitPromise.resolve, cfg.minIdle);
                //cfg.events.push({ 'time': new Date(), 'event': 'console', 'type': 'DEBUG', 'data': `set waitIdle id=${cfg.waitIdle} time=${cfg.minIdle}`  });
            }

        }
    });

    // listen for console messages
    context.on('console', async (message) => {
        /** @type {ContextData} */
        const cfg = context.cfg;

        if (message.text() != "JSHandle@error") {
            cfg.events.push({ 'time': new Date(), 'event': 'console', 'type': message.type().toUpperCase(), 'data': message.text() });
            return;
        };

        const messages = await Promise.all(message.args().map((arg) => {
            return arg.getProperty("message");
        }));

        msg = `${messages}`
        cfg.events.push({ 'time': new Date(), 'event': 'console', 'type': message.type().toUpperCase(), 'data': msg });
    });

    context.on('page', page => {
        //context.cfg.events.push({ 'time': new Date(), 'event': 'console', 'type': 'INFO', 'data': `New page created: ${page.url()}` });
        page.on('framenavigated', frame => {
            context.cfg.events.push({ 'time': new Date(), 'event': 'console', 'type': 'INFO', 'data': `Frame navigated: ${frame.url()}` });
        });
        page.on('pageerror', data => {
            context.cfg.events.push({ 'time': new Date(), 'event': 'console', 'type': 'ERROR', 'data': data.message });
        });
    });

    logger(`init Event Logger finish`);
}

async function checkAlerts(context, page, path, timeout = 100) {

    //context.cfg.events.push({ 'time': new Date(), 'event': 'console', 'type': 'DEBUG', 'data': 'check Alerts' });

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

        //cfg.events.push({ 'time': new Date(), 'event': 'console', 'type': 'DEBUG', 'data': `wait Started waiting=${waiting} idle=${idle}` });

        if (waiting === 0) {
            if (idle > cfg.minIdle) {
                //cfg.events.push({ 'time': new Date(), 'event': 'console', 'type': 'DEBUG', 'data': `wait Resolve` });
                resolve();
                return;
            }
            else {
                cfg.waitIdle = setTimeout(resolve, cfg.minIdle - idle);
                //cfg.events.push({ 'time': new Date(), 'event': 'console', 'type': 'DEBUG', 'data': `wait set id=${cfg.waitIdle} time=${cfg.minIdle - idle}` });
            }
        }

        cfg.waitTimeout = setTimeout(() => {
            reject(new Error(`waitForApiEvents: Max wait time of ${cfg.maxWait}ms exceeded outstanding=${[...cfg.activeRequests].join(',')} id=${cfg.waitTimeout}`));
        }, cfg.maxWait);
        //cfg.events.push({ 'time': new Date(), 'event': 'console', 'type': 'DEBUG', 'data': `set waitTimeout id=${cfg.waitTimeout} time=${cfg.maxWait}` });

    });

}

// Wait for all outstanding events
async function waitForEvents(context, page, logger) {

    const cfg = context.cfg;
    if (!cfg) return;
    const startTime = new Date();

    // Wait for all events that we expect to happen
    try {
        // Check for alerts first because no need to wait for API events if we fail on alerts
        if (cfg.alerts) await checkAlerts(context, page, path = cfg.alerts);

        const startPromise = Date.now()

        await waitPromise(cfg);

        cfg.waitPromise = null;

        if (cfg.waitIdle) {
            //cfg.events.push({ 'time': new Date(), 'event': 'console', 'type': 'DEBUG', 'data': `clear waitIdle id=${cfg.waitIdle}` });
            clearTimeout(cfg.waitIdle);
            cfg.waitIdle = null;
        }

        if (cfg.waitTimeout) {
            //cfg.events.push({ 'time': new Date(), 'event': 'console', 'type': 'DEBUG', 'data': `clear waitTimeout id=${cfg.waitTimeout}` });
            clearTimeout(cfg.waitTimeout);
            cfg.waitTimeout = null;
        }

        //cfg.events.push({ 'time': new Date(), 'event': 'console', 'type': 'DEBUG', 'data': `wait End delta=${Date.now()-startPromise}` });
        // Check for alerts again after all API responses have been processed
        if (cfg.alerts) await checkAlerts(context, page, path = cfg.alerts);
    } catch (error) {
        // usually an alert or timeout error
        cfg.events.push({ 'time': new Date(), 'event': 'console', 'type': 'ERROR', 'data': error });
        throw error;
    }

    const endTime = new Date();
    const delta = endTime - startTime;

    cfg.events.push({ 'time': endTime, 'event': 'console', 'type': 'INFO', 'data': `Wait satisfied in ${delta} ms` });
}

async function reportEvents(context, logger) {

    if (!('cfg' in context)) return;

    // Return raw event data as JSON
    return context.cfg.events.map(ev => ({
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
