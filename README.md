# Robot Framework Event Logger

De Event Logger biedt een set van tools en keywords om problemen met asynchroon gedrag op te lossen en meer inzicht te krijgen in het gedrag van je webapplicatie. In deze repository vind je zowel de code als een voorbeeld project om een en ander uit te kunnen testen.

![log](images/log.png)

## Hoe gebruik je de Event Logger?

Volg de onderstaande stappen om de Event Logger te gebruiken:

### 1. Voeg de Event Logger toe aan je test suite
De EventLogger maakt gebruik van twee scripts ([EventLogger.py](resources/EventLogger.py) en een Browser extensie [Eventlogger.js](resources/EventLogger.js)). Importeer de Browser en Event Logger library in je Robot Framework test suite. Voeg de volgende regels toe aan je `.robot` bestand:
```robot
*** Settings ***
Library        Browser    jsextension=${CURDIR}/EventLogger.js
Library        EventLogger
```

### 2. Initialiseer de Event Logger
Zorg ervoor dat de Playwright Browser Context is geïnitialiseerd voordat je de Event Logger gebruikt. Initialiseer de EventLogger voor elke test:
```robot
Test Setup
    [Documentation]  Open Browser Home Page
    Browser.New Context  tracing=${TRACING}
    EventLogger.Init  maxWait=10000  minIdle=150  waitAfter=Browser.Click, Browser.Go To  
    ...               alerts=xpath=//div[contains(@class, 'alert-danger')]

```
Argumenten:
* maxWait: timeout in milliseconde (maximaal te wachten)
* minIdle: wacht tot er geen API requests meer zijn
* waitAfter: een lijst met keywords

### 3. Rapporteer de events
```robot
Test Teardown
  [Documentation]  Test Teardown
  EventLogger.Report Event Logging
  Run Keyword If Test Failed    Take Screenshot  fullPage=True
```

### 4. Gebruik WaitForEvents
In de meeste gevallen kan EventLogger.Init gebruiken om aan te geven wanneer je wilt wachten op API requests. Bijvoorbeeld wacht altijd direct na een nieuwe pagina "Go To" en na een Click op een button of link. Dat zal in de meeste gevallen voldoende zijn.

Daarnaast kan je ook Wait For Events als los keyword gebruiken.

 ```robot
EventLogger.Init  maxWait=10000  minIdle=150  
...               waitAfter=Browser.Click, Browser.Go To 
...               alerts=xpath=//div[contains(@class, 'alert-danger')]

     
 Wait For Events
```

### 5. Bekijk de logs
Na het uitvoeren van een test, kun je de gegenereerde logs bekijken in de `results` map. Open `log.html` in een browser om een overzicht te krijgen van de gelogde events.

### 5. Aanpassen van de Event Logger
Als je specifieke functionaliteiten nodig hebt, kun je de Python en javascript functies in de Event Logger uitbreiden. Voeg je eigen functies toe aan de `EventLogger.py` en gebruik ze in je tests.
