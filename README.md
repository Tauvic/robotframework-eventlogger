# Robot Framework Event Logger

Robot Framework is a versatile and user-friendly test automation framework, known for its keyword-driven approach that simplifies test script creation. However, testing modern asynchronous web applications, particularly those built with frameworks like Angular and React, can present challenges.

These applications heavily rely on JavaScript to dynamically update page content by fetching data from backend services in the background. This asynchronous behavior makes it difficult for traditional test automation techniques to reliably interact with and verify the application's state.

**Robot Framework Event Logger** addresses these challenges by providing a dedicated set of tools and custom keywords designed to enhance your testing capabilities for asynchronous web applications. This library also offers deeper insights into the dynamic behavior of your application, enabling more robust and reliable test automation.

**In this repository, you will find:**

* The source code for the Robot Framework Event Logger library.
* An example project demonstrating how to effectively utilize the provided keywords and tools in a real-world scenario.

We encourage you to explore the code and the example project to understand how the Event Logger can help you overcome the complexities of testing asynchronous web applications with Robot Framework.

For my Thai friends: ตัวบันทึกเหตุการณ์ (Event Logger) มีชุดเครื่องมือและคีย์เวิร์ดต่างๆ เพื่อแก้ไขปัญหาเกี่ยวกับพฤติกรรมแบบอะซิงโครนัส (asynchronous behavior) และช่วยให้เข้าใจพฤติกรรมของเว็บแอปพลิเคชันของคุณได้ลึกซึ้งยิ่งขึ้น ใน repository นี้ คุณจะพบทั้งโค้ดและโปรเจกต์ตัวอย่างเพื่อให้คุณสามารถทดลองใช้งานทุกอย่างได้

## What does it do?

The Event Logger leverages the power of the Browser (Playwright) Library to provide enhanced testing capabilities. It comprises a Python library offering additional keywords, a listener interface for seamless integration with your tests, and JavaScript code injected into the browser to collect crucial data. Importantly, it supports all browsers compatible with Playwright.

The Event Logger offers the following key services:

* **Collect and Log Web App Events:**
    * Asynchronous API requests, providing visibility into background data fetching.
    * Web application alerts and messages, capturing important user interactions and notifications.
    * Web application console logging, allowing you to track JavaScript errors and debugging information.
* **Synchronize Test Activity with Events:** Enables your test scripts to intelligently wait for specific events to occur before proceeding, ensuring stability and preventing premature interactions.
* **Enable Event-Based Assertions (Future Feature):** Laying the groundwork for future capabilities to directly assert on the occurrence and details of logged events.
* **Generate Contextual Reports:** Creates comprehensive reports that integrate scripted test actions with the recorded events, providing a clear timeline and understanding of application behavior during testing.

Integrating the Event Logger into your existing Robot Framework test scripts requires minimal modifications, allowing you to quickly benefit from its advanced features.


## How to use the Event Logger??


### 1. Add the Event Logger to your test suite

The EventLogger itself is currently based on only two scripts ([EventLogger.py](resources/EventLogger.py) and a javascript Browser extension [Eventlogger.js](resources/EventLogger.js)). You have to add these to your project. 

Import the Browser and Event Logger libraries into your Robot Framework test suite. Add the following lines to your `.robot` or `.resource` file:
```robot

*** Settings ***
Library        Browser    jsextension=${CURDIR}/EventLogger.js
Library        EventLogger
```
In my project is use a [common.resource](resources/common.resource) resource file.

### 2.  Initialize the Event Logger

The Event Logger collects and manages all events withing the scope of a Browser Context and a test. Optional reporting is done after each test.

For proper performance, ensure that the Playwright Browser Context is initialized first. Then initialize the EventLogger immediately after:

```robot
Test Setup
    [Documentation]  Open Browser Home Page
    Browser.New Context  tracing=${TRACING}
    EventLogger.Init  maxWait=10000  minIdle=150  waitAfter=Browser.Click, Browser.Go To  
    ...               alerts=xpath=//div[contains(@class, 'alert-danger')]

```

Arguments:

* maxWait: timeout in milliseconds to wait (maximum wait time)
* minIdle: wait until there are no more API requests
* waitAfter: a list of keywords, comma seperated (will automaticely wait after these keywords)

### 3. Report the events

After each test we add EventLogger to report all collected events and alerts.

```robot
Test Teardown
  [Documentation]  Test Teardown
  EventLogger.Report Event Logging
  Run Keyword If Test Failed    Take Screenshot  fullPage=True
```

### 4. Use WaitForEvents

In most cases, you can setup EventLogger.Init to indicate when you want to wait for API requests. For example, always wait immediately after a new page "Go To" and after a Click on a button or link. This will be sufficient in most cases. The EventLogger has a listener interface that recognizes you use a keyword and automaticly inserts a WaitForEvents keyword.

 ```robot
# Notice we have removed waitAfter 
EventLogger.Init  maxWait=10000  minIdle=150  
...               waitAfter=Browser.Click, Browser.Go To 
...               alerts=xpath=//div[contains(@class, 'alert-danger')]

# Somewhere in your script    
# Click at the login button
${l_button}    Get Element By Role    button    name=Login    exact=true
Click  ${l_button}

 # Now we have waited for all API request
 # Here we can check the UI because its stable
```

But if you need more control you can also use Wait For Events as a separate keyword and add it where you need it.

 ```robot
# Notice we have removed waitAfter 
EventLogger.Init  maxWait=10000  minIdle=150  
...               alerts=xpath=//div[contains(@class, 'alert-danger')]

 # Somewhere in your script    
 Wait For Events
 # Now we have waited for all API request
 # Here we can check the UI because its stable
```

### 5. View the logs
After running a test, you can view the generated logs in the `results` folder. Open `log.html` in a browser to get an overview of the logged events.

![log](images/log.png)

### 5.  Customizing the Event Logger
If you need specific functionalities, you can extend the Python and JavaScript functions in the Event Logger. Add your own functions to `EventLogger.py` and use them in your tests.
