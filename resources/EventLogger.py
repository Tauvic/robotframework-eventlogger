from robot.api.deco import library, keyword
from robot.api import logger
from robot import running, result
from robot.libraries.BuiltIn import BuiltIn
from datetime import datetime, timezone

import html

@library(scope='TEST', version='0.0.1',listener='SELF')
class EventLogger:

    """
    Author: Tauvic Ritter (https://github.com/Tauvic)
    Description: Event Logger for Robot Framework
    License: MIT License
    """

    ROBOT_LISTENER_API_VERSION = 3

    def __init__(self):
      """
      Init Event Logger
      """
      logger.info(f"Event Listener init", also_console=True)
      self.waitAfter = None
      self.ommit = ['BuiltIn','Collections']
      self.pageOpen= False
      self.level = 0
      self.local_events = []  # Local list to store events

    @keyword('Init')
    def initEventLogging(self, 
                         maxWait:int=10000,
                         minIdle:int=150,
                         waitAfter:str=None,
                         alerts:str=None,):
        """
        Init Event Logging        
        """
        self.waitAfter = waitAfter
        BuiltIn().run_keyword('Browser.initEventLogger',maxWait,minIdle,alerts) 

    @keyword('Wait For Events')
    def waitForEvents(self):
        """
        Wait for Events
        """
        BuiltIn().run_keyword('Browser.waitForEvents') 
   
    @keyword('Report Event Logging')
    def report_event_logging(self,addToTestMessage=True) -> str:
        """
        Report Event Logging
        """
        # Retrieve all events from JavaScript
        js_events = BuiltIn().run_keyword('Browser.reportEvents')

        # Merge local events with JavaScript events based on timestamps
        all_events = self.local_events + js_events
        all_events.sort(key=lambda ev: datetime.fromisoformat(ev['time']))

        # Generate HTML report
        report = self._generate_html_report(all_events).replace('{','^')

        # Attach report to Robot Framework logs
        if report and addToTestMessage:
            args = {'append': True}
            BuiltIn().run_keyword('Set Test Message', f"*HTML*{report}", args)

        return report

    def _generate_html_report(self, events):
        """
        Generate an HTML report from the merged events.
        """
        if not events:
            return ""

        level = 0
        html = '<table style="width:100%"><tr><th style="width:100px">Time</th><th style="width:100px">Event source</th><th style="width:100px">Type</th><th style="width:100%">Data</th></tr>'
        for ev in events:
            time = ev['time'][11:23]  # Extract time from ISO timestamp
            event = ev['event']
            event_type = ev['type']
            data = self._format_event_data(ev)
            level = ev.get('level', level)

            space = '&nbsp;' * ((level-1) * 4)  # Indent based on level
            if event != 'script':
               space = space + ('&nbsp;' * 4)

            html += f"<tr><td>{time}</td><td>{event}</td><td>{event_type}</td><td>{space}{data}</td></tr>"
        html += '</table>'
        return f"<details><summary>Event log:</summary>{html}</details>"

    def _format_event_data(self, event):
        """
        Format event data based on its type.
        """
        if event['event'] == 'request':
            rqd = event['data']
            rq_status = f"<span style='color:red'>{rqd['failure']}</span>" if rqd.get('failure') else "<span style='color:green'>Ok</span>"
            header = f"{rqd['requestID']:03d} {rqd['method']} {rqd['resourceType']} {rqd['url']} {rq_status}"
            details = f"<details><summary>{header}</summary><pre>{rqd.get('postData', '')}</pre></details>" if rqd.get('postData') else header
            return details

        if event['event'] == 'response':
            rqd, rsd = event['data']
            s_c = 'green' if rsd['ok'] else 'red'
            header = f"{rqd['requestID']:03d} {rqd['method']} {rqd['resourceType']} {rqd['url']} <span style='color:{s_c}'>status={rsd['status']} {rsd['statusText']}</span>"
            details = f"<details><summary>{header}</summary><pre>{rsd.get('content', '')}</pre></details>" if rsd.get('content') else header
            return details

        if event['event'] == 'console':
            msg = event['data']
            if event['type'] == 'ERROR':
                msg = f"<span style='color:red'>{msg}</span>"
            return msg

        if event['event'] == 'script':
            return f"<span style='color:blue'>{event['data']}</span>"

        # Default formatting for other event types
        return str(event['data'])
      
    def start_user_keyword(self, kw:running.Keyword, impl, result:result.Keyword): 

      if result.status in ['FAIL','SKIP','NOT RUN']: return

      try:
        self.level +=1

        args = " ".join([str(arg) for arg in kw.args])    
        logger.info(f"Start: {kw.name} {args}",also_console=True)
        if  len(args) > 60:
          details = f'<details><summary>arguments</summary>{html.escape(args)}</details>'
        else: 
          details = html.escape(args) 
        details = ''

        self.local_events.append({'time': datetime.now(timezone.utc).isoformat(), 
                                  'level': self.level,
                                  'event': 'script', 
                                  'type': 'INFO', 
                                  'data': f"Start: {kw.name} {details}"})
      except  Exception as ex:
        logger.warning(ex)
        self.pageOpen = False             

    def end_user_keyword(self, kw:running.Keyword, impl, result:result.Keyword):

      if result.status in ['SKIP','NOT RUN']: return result

      try:
        msg = f"End : {kw.name} library={result.libname} status={result.status}"     
        logger.info(msg,also_console=True)   
        self.local_events.append({'time': datetime.now(timezone.utc).isoformat(), 
                                  'level': self.level,
                                  'event': 'script', 
                                  'type': 'INFO', 
                                  'data': msg})               
      except  Exception as ex:
        logger.warning(ex)
        self.pageOpen = False                    
      finally:
        if (self.level > 0): self.level -=1   
  
    def start_library_keyword(self, kw:running.Keyword, impl, result:result.Keyword):
      
      if result.status in ['FAIL','SKIP','NOT RUN']: return

      libname = result.libname
          
      if libname == 'Browser':
          if kw.name == 'New Page':
            self.pageOpen = True
          if kw.name in ['Close Page','Close Context','Close Browser']:
            self.pageOpen = False

          if kw.name not in ['Click','Go To','Go Back','Go Forward']: return

      if 'Teardown' in kw.name:
          self.pageOpen = False

      if libname in self.ommit:
          return      
      
      args = " ".join([str(arg) for arg in kw.args])
      msg = f"Start: {kw.name} {args}"  
      logger.info(msg,also_console=True)

      self.level +=1       
 
      details = " ".join([str(arg) for arg in kw.args])
      if  len(args) > 60:
        details = f'<details><summary>arguments</summary>{args}</details>'

      details=''       
      
      msg = f"Start: {kw.name} {details}" 
      self.local_events.append({'time': datetime.now(timezone.utc).isoformat(), 
                                'level': self.level,
                                'event': 'script', 
                                'type': 'INFO', 
                                'data': msg})


    def end_library_keyword(self, kw:running.Keyword, impl, result:result.Keyword):

      if result.status in ['SKIP','NOT RUN']: return

      libname = result.libname
          
      if libname == 'Browser':
          if kw.name == 'New Page':
            self.pageOpen = True
          if kw.name in ['Close Page','Close Context','Close Browser']:
            self.pageOpen = False

          if kw.name not in ['Click','Go To','Go Back','Go Forward']: return

      if 'Teardown' in kw.name:
          self.pageOpen = False

      if libname in self.ommit:
          return    
      
      # Auto start wait for Events
      if self.pageOpen and self.waitAfter and f"{libname}.{kw.name}" in self.waitAfter:           
        try:
          BuiltIn().run_keyword('Browser.waitForEvents') 
        except  Exception as ex:
          # logger.error(ex)
          result.status = 'FAIL'
          result.message = str(ex)

      msg = f"End : {kw.name} library={result.libname} status={result.status}"  
      logger.info(msg,also_console=True)   
      self.local_events.append({'time': datetime.now(timezone.utc).isoformat(), 
                                'level': self.level,
                                'event': 'script', 
                                'type': 'INFO', 
                                'data': msg})

      self.level -=1   



