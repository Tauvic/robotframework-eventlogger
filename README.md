# Robot Framework Event Logger

Robot Framework is an powerful and easy to learn test framework. Its keywords provide you with a syntax to build test scripts. It has limitations when dealing with asynchronous web applications such as Angular and React.

The Event Logger therefore provides you with a set of tools and keywords to solve these challenges and gain more insight into the behavior of your web application. In this repository, you will find both the code and an example project to try out and test everything.

ตัวบันทึกเหตุการณ์ (Event Logger) มีชุดเครื่องมือและคีย์เวิร์ดต่างๆ เพื่อแก้ไขปัญหาเกี่ยวกับพฤติกรรมแบบอะซิงโครนัส (asynchronous behavior) และช่วยให้เข้าใจพฤติกรรมของเว็บแอปพลิเคชันของคุณได้ลึกซึ้งยิ่งขึ้น ใน repository นี้ คุณจะพบทั้งโค้ดและโปรเจกต์ตัวอย่างเพื่อให้คุณสามารถทดลองใช้งานทุกอย่างได้

The Event Logger is based on the Browser (Playwright) Library. It consists of a Python library to support additional keywords, a listener interface and some javascript to collect data within the browser. It supports all browsers supported by Playwright. 

The Event Logger provides the following services:

* Collect and log web app events:
  * asynchronous API requests
  * web app alerts and messages
  * web app console logging
* Synchronize test activity with these events
* Enable you to use these events in assertions (future feature)
* Create reports showing scripted activities and events in context

## How to use the Event Logger??


### 1. Add the Event Logger to your test suite

The EventLogger itself is currently based on two scripts ([EventLogger.py](resources/EventLogger.py) and a javascript Browser extension [Eventlogger.js](resources/EventLogger.js)). Import the Browser and Event Logger libraries into your Robot Framework test suite. Add the following lines to your `.robot` file:
```robot

*** Settings ***
Library        Browser    jsextension=${CURDIR}/EventLogger.js
Library        EventLogger
```



### 2.  Initialize the Event Logger

Ensure that the Playwright Browser Context is initialized before using the Event Logger. Initialize the EventLogger for each test:

```robot
Test Setup
    [Documentation]  Open Browser Home Page
    Browser.New Context  tracing=${TRACING}
    EventLogger.Init  maxWait=10000  minIdle=150  waitAfter=Browser.Click, Browser.Go To  
    ...               alerts=xpath=//div[contains(@class, 'alert-danger')]

```

Arguments:

* maxWait: timeout in milliseconds (maximum wait time)
* minIdle: wait until there are no more API requests
* waitAfter: a list of keywords, comma seperated (will automaticly wait after these)

### 3. Report the events

After each test we add EventLogger to report all collected events and alerts.

```robot
Test Teardown
  [Documentation]  Test Teardown
  EventLogger.Report Event Logging
  Run Keyword If Test Failed    Take Screenshot  fullPage=True
```

### 4. Use WaitForEvents

In most cases, you can use EventLogger.Init to indicate when you want to wait for API requests. For example, always wait immediately after a new page "Go To" and after a Click on a button or link. This will be sufficient in most cases.

You can also use Wait For Events as a separate keyword.

 ```robot
EventLogger.Init  maxWait=10000  minIdle=150  
...               waitAfter=Browser.Click, Browser.Go To 
...               alerts=xpath=//div[contains(@class, 'alert-danger')]

     
 Wait For Events
```

### 5. View the logs
After running a test, you can view the generated logs in the `results` folder. Open `log.html` in a browser to get an overview of the logged events.

![log](images/log.png)

### 5.  Customizing the Event Logger
If you need specific functionalities, you can extend the Python and JavaScript functions in the Event Logger. Add your own functions to `EventLogger.py` and use them in your tests.
