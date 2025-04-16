# Robot Framework Event Logger

Robot Framework is a versatile and user-friendly test automation framework, known for its keyword-driven approach that simplifies test script creation. However, testing modern asynchronous web applications, particularly those built with frameworks like Angular and React, can present challenges.

These applications heavily rely on JavaScript to dynamically update page content by fetching data from backend services in the background. This asynchronous behavior makes it difficult for traditional test automation techniques to reliably interact with and verify the application's state.

**Robot Framework Event Logger** addresses these challenges by providing a dedicated set of tools and custom keywords designed to enhance your testing capabilities for asynchronous web applications. This library also offers deeper insights into the dynamic behavior of your application, enabling more robust and reliable test automation.

**In this repository, you will find:**

* The source code for the Robot Framework Event Logger library.
* An example project demonstrating how to effectively utilize the provided keywords and tools in a real-world scenario.

We encourage you to explore the code and the example project to understand how the Event Logger can help you overcome the complexities of testing asynchronous web applications with Robot Framework.

For my Thai friends: ตัวบันทึกเหตุการณ์ (Event Logger) มีชุดเครื่องมือและคีย์เวิร์ดต่างๆ เพื่อแก้ไขปัญหาเกี่ยวกับพฤติกรรมแบบอะซิงโครนัส (asynchronous behavior) และช่วยให้เข้าใจพฤติกรรมของเว็บแอปพลิเคชันของคุณได้ลึกซึ้งยิ่งขึ้น ใน repository นี้ คุณจะพบทั้งโค้ดและโปรเจกต์ตัวอย่างเพื่อให้คุณสามารถทดลองใช้งานทุกอย่างได้

## What does Event Logger do?

The Event Logger leverages the power of the Browser (Playwright) Library to provide enhanced testing capabilities. It comprises a Python library offering additional keywords, a listener interface for seamless integration with your tests, and JavaScript code injected into the browser to collect crucial data. Importantly, it supports all browsers compatible with Playwright.

The Event Logger offers the following key services:

* **Collect and Log Web App Events:**
    * Asynchronous API requests, providing visibility into background data fetching.
    * Web application alerts and messages, capturing important user interactions and notifications.
    * Web application console logging, allowing you to track JavaScript errors and debugging information.
* **Synchronize Test Activity with Events:** Enables your test scripts to intelligently wait for specific events to occur before proceeding, ensuring stability and preventing premature interactions.
* **Enable Event-Based Assertions (Future Feature):** Laying the groundwork for future capabilities to directly assert on the occurrence and details of logged events.
* **Generate Contextual Reports:** Creates comprehensive reports that integrate scripted test actions with the recorded events, providing a clear timeline and understanding of application behavior during testing.

Integrating the Event Logger into your existing Robot Framework test scripts requires **minimal modifications**, allowing you to quickly benefit from its advanced features.

## How to use the Event Logger?

### 1. Add the Event Logger to your Test Suite

The core of the Event Logger currently consists of two essential files: `EventLogger.py` (the Python library) located in `resources/EventLogger.py`, and `Eventlogger.js` (the browser extension in JavaScript) found at `resources/Eventlogger.js`. You need to include these files within your project structure.

Import both the Browser library and the Event Logger library into your Robot Framework test suite. Add the following lines to your `.robot` or `.resource` file:

```robot
*** Settings ***
Library           Browser         jsextension=${CURDIR}/EventLogger.js
Library           EventLogger
```

In my project, I utilize a common.resource file (located at resources/common.resource) to manage such imports.

## 2. Initialize the Event Logger
The Event Logger operates by collecting and managing events within the scope of a Playwright Browser Context and an individual test case. Optional reporting of these events occurs after each test execution.

For optimal performance and correct operation, ensure that the Playwright Browser Context is initialized before initializing the EventLogger immediately afterward:

```robot
Test Setup
    [Documentation]    Open Browser Home Page
    Browser.New Context    tracing=${TRACING}
    EventLogger.Init    maxWait=10000    minIdle=150    waitAfter=Browser.Click, Browser.Go To
    ...                alerts=xpath=//div[contains(@class, 'alert-danger')]
```
Arguments for EventLogger.Init:

* `maxWait`: The maximum timeout in milliseconds to wait for events to settle.

* `minIdle`: The minimum time in milliseconds of inactivity (no new API requests) to consider events settled.

* `waitAfter`: A comma-separated list of Robot Framework keywords. The Event Logger will automatically wait for events after the execution of these specified keywords.

* `alerts`: An optional locator (e.g., XPath) to identify elements on the page that represent application alerts or error messages. These will be specifically tracked and included in the reports.

## 3. Report the Events
To generate a report of all collected events and alerts after each test, add the EventLogger.Report keyword to your test teardown:

```robot
Test Teardown
    [Documentation]    Test Teardown
    EventLogger.Report Event Logging
    Run Keyword If Test Failed    Take Screenshot    fullPage=True
```

## 4. Utilize WaitForEvents for Synchronization
In many scenarios, configuring the waitAfter argument during EventLogger.Init will be sufficient to ensure your tests wait for API requests to complete after specific actions like navigating to a new page `Browser.Go To` or clicking buttons/links `Browser.Click`. The Event Logger's listener interface automatically inserts a `WaitForEvents` call after these specified keywords.

```robot
# Notice we have removed waitAfter from the Init
EventLogger.Init    maxWait=10000    minIdle=150
...                alerts=xpath=//div[contains(@class, 'alert-danger')]

# Somewhere in your script
# Click the login button
${l_button}    Get Element By Role    button    name=Login    exact=true
Click    ${l_button}

# The Event Logger automatically waits for API requests to settle after the Click
# Now you can reliably interact with the UI as it should be stable
```

However, for more granular control over when to wait for events, you can explicitly use the Wait For Events keyword within your test script:

```robot
# Notice we have removed waitAfter from the Init
EventLogger.Init    maxWait=10000    minIdle=150
...                alerts=xpath=//div[contains(@class, 'alert-danger')]

# Somewhere in your script
Wait For Events
# You can now perform assertions on the stable UI
```

### 5. View the Logs
After executing your tests, detailed logs of the collected events are generated in the results folder. Open the `log.html` file in your web browser to access a comprehensive overview of the logged events, providing valuable context for your test execution.

![Log](./images/log.png)

### 6. Customizing the Event Logger
For users with specific needs, the Event Logger offers extensibility. If you need specific functionalities, you can extend the Python and JavaScript functions. Add your own functions to `EventLogger.py` and use them in your tests.