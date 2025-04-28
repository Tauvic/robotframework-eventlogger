// router_listener.js

/**
 * Sets up a listener for router events and stores them in a global array.
 */
async function setupRouterListener() {
    try {
      const router = await new Promise((resolve, reject) => {
        let attempts = 0;
        const maxAttempts = 20;
        const intervalDelay = 250;
  
        const intervalId = setInterval(() => {
          attempts++;
          const rootElement = document.querySelector('app-root');
          if (rootElement) {
            try {
              let rootComponentInstance = null;
  
              // 1. Try to get the instance via a direct property (for development mode, often works)
              if (rootElement.__ngContext__) {
                const ngContext = rootElement.__ngContext__;
                //Access the first component.
                if(ngContext){
                  rootComponentInstance = ng.getContext(rootElement);
                   if (rootComponentInstance && rootComponentInstance.router) {
                        clearInterval(intervalId);
                        resolve(rootComponentInstance.router);
                        return;
                    }
                }
              }
  
              // 2. Try to get the instance using window.ng (if available - for debugging)
              const ng = window.ng;
              if (ng) {
                const applicationRef = ng.getInjector().get(ng.core.ApplicationRef);
                if (applicationRef && applicationRef.components && applicationRef.components.length > 0) {
                  rootComponentInstance = applicationRef.components[0].instance;
                  if (rootComponentInstance && rootComponentInstance.router) {
                    clearInterval(intervalId);
                    resolve(rootComponentInstance.router);
                    return;
                  }
                }
              }
  
              // 3.  Fallback:  Try to find the router by traversing the DOM (less reliable)
              if (!rootComponentInstance) {
                function findRouter(element) {
                  if (!element) return null;
                  if (element.router) return element.router;
                  if (element.children && element.children.length > 0) {
                    for (const child of element.children) {
                      const found = findRouter(child);
                      if (found) return found;
                    }
                  }
                  return null;
                }
                const routerFromDom = findRouter(rootElement);
                if (routerFromDom) {
                  clearInterval(intervalId);
                  resolve(routerFromDom);
                  return;
                }
              }
  
            } catch (e) {
              // Ignore the error, and keep trying.
            }
          }
          if (attempts >= maxAttempts) {
            clearInterval(intervalId);
            reject(new Error('Router not found after timeout.'));
          }
        }, intervalDelay);
      });
  
      if (!window.routerEvents) {
        window.routerEvents = [];
      }
  
      router.events.subscribe((event) => {
        const eventDetails = {
          type: event.constructor.name,
          url: event.url ? event.url : null,
          urlAfterRedirects: event.urlAfterRedirects ? event.urlAfterRedirects : null,
          id: event.id ? event.id : null,
        };
        console.log('Router Event:', eventDetails);
        window.routerEvents.push(eventDetails);
      });
  
      console.log('Router listener set up.');
    } catch (error) {
      console.error('Error setting up router listener:', error);
      throw error;
    }
  }
  
  window.getRouterEvents = function () {
    return JSON.stringify(window.routerEvents || []);
  };
  
  window.clearRouterEvents = function () {
    window.routerEvents = [];
  };
  
  setupRouterListener();
  