from robot.api.deco import library, keyword
from robot.api import logger
from robot import running, result
from robot.libraries.BuiltIn import BuiltIn
import datetime, time
from enum import Enum

import html

class LogLevel(Enum):
    DEBUG = 1
    INFO = 2
    WARN = 3
    ERROR = 4
    NONE = 5

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
      self.level = 0
      self.local_events = []  # Local list to store events
      self.logLevel:LogLevel = LogLevel.INFO

    @keyword('Init')
    def initEventLogging(self, 
                         maxWait:int=10000,
                         minIdle:int=150,
                         waitAfter:str=None,
                         alerts:str=None,
                         logLevel:LogLevel=LogLevel.INFO):
        """
        Init Event Logging        
        """
        self.waitAfter = waitAfter
        self.logLevel  = logLevel
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
        all_events.sort(key=lambda ev: ev['time'])
        
        # Generate HTML report
        report = self._generate_html_report(all_events).replace('{','\{')

        # Attach report to Robot Framework logs
        if report and addToTestMessage:
            args = {'append': True}
            BuiltIn().run_keyword('Set Test Message', f"*HTML*{report}", args)

        return report

    def _format_time(self,milliseconds):
      """Converts milliseconds since the epoch to HH:MM:SS.mmm format."""
      seconds = milliseconds / 1000
      dt_object = datetime.datetime.fromtimestamp(seconds)
      return dt_object.strftime("%H:%M:%S.%f")[:-3]

    def _generate_html_report(self, events):
        """
        Generate an HTML report from the merged events.
        """
        if not events: return ""

        level = 0
        context = None
        bgcolors = ['#5dade2','#1abc9c']  #  background colors
        bgcolor = 0 # Start with the first color
        html = '<table style="width:100%"><tr><th style="width:80px">Time</th><th style="width:60px">Source</th><th style="width:60px">Type</th><th style="width:30px">CTX</th><th style="width:100%">Data</th></tr>'
        for ev in events:            
            time = self._format_time(ev['time'])
            event = ev['event']
            event_type = ev['type']
            if LogLevel[event_type].value < self.logLevel.value: continue            
            data = self._format_event_data(ev)
            level = ev.get('level', level)

            if event == 'script':
               bonus = 0
            else:
               bonus = 1

            # Use margin-left for indentation
            indent_style = f"margin-left: {(level + bonus) * 20}px;"  # 20px per level

            new_context = ev.get('context', context)
            if new_context != context:
              bgcolor = 0 if bgcolor == 1 else 1  # Alternate background color
              context = new_context
              html += f"<tr style='background:{bgcolors[bgcolor]}'><td>{time}</td><td>{event}</td><td>{event_type}</td><td></td><td><div style='{indent_style}'>{data}</div></td></tr>"
            else:
              html += f"<tr><td>{time}</td><td>{event}</td><td>{event_type}</td><td style='background:{bgcolors[bgcolor]}'></td><td><div style='{indent_style}'>{data}</div></td></tr>"
           
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
        args = " ".join([str(arg) for arg in result.args])    
        logger.info(f"Start: {kw.name} {args}",also_console=True)
        if  len(args) > 80:
          args = f'<details><summary>arguments</summary>{args}</details>'

        self.local_events.append({'time': int(time.time() * 1000), 
                                  'level': self.level,
                                  'event': 'script', 
                                  'type': 'INFO', 
                                  'data': f"Start: {kw.name} {args}"})
        self.level +=1

      except  Exception as ex:
        logger.warning(ex)        

    def end_user_keyword(self, kw:running.Keyword, impl, result:result.Keyword):

      if result.status in ['SKIP','NOT RUN']: return result

      try:
        msg = f"End : {kw.name} library={result.libname} status={result.status}"     
        logger.info(msg,also_console=True)   
        if (self.level > 0): self.level -=1           
        self.local_events.append({'time': int(time.time() * 1000), 
                                  'level': self.level,
                                  'event': 'script', 
                                  'type': 'INFO', 
                                  'data': msg})               
      except  Exception as ex:
        logger.warning(ex)                 

      # What library key words should we log and how
      # The keyword that we mention in waitAfter will be logged with start/end
      # the other keywords will be logged with start

    def start_library_keyword(self, kw:running.Keyword, impl, result:result.Keyword):
      
      if result.status in ['FAIL','SKIP','NOT RUN']: return

      if self.waitAfter and f"{result.libname}.{kw.name}" in self.waitAfter:  
        logPrefix = 'Start: '   
      else:
        if result.libname in self.ommit: return
        logPrefix = ''
      
      args = " ".join([str(arg) for arg in result.args])
      msg = f"{logPrefix}{kw.name} {args}"  
      logger.info(msg,also_console=True)

      if kw.name == 'Browser.waitForEvents': return       
 
      if  len(args) > 80:
        args = f'<details><summary>arguments</summary>{args}</details>'     
      
      msg = f"{logPrefix}{kw.name} {args}" 
      self.local_events.append({'time': int(time.time() * 1000), 
                                'level': self.level,
                                'event': 'script', 
                                'type': 'INFO', 
                                'data': msg})
    
      if logPrefix == 'Start: ':
        self.level +=1

    def end_library_keyword(self, kw:running.Keyword, impl, result:result.Keyword):

      if result.status in ['SKIP','NOT RUN']: return       
      
      # Auto start wait for Events
      if self.waitAfter and f"{result.libname}.{kw.name}" in self.waitAfter:    
        try:
          BuiltIn().run_keyword('Browser.waitForEvents') 
        except  Exception as ex:
          # logger.error(ex)
          result.status = 'FAIL'
          result.message = str(ex)
      else:
         return

      self.level -=1   
      msg = f"End:  {kw.name} library={result.libname} status={result.status}"  
      logger.info(msg,also_console=True)   
      self.local_events.append({'time': int(time.time() * 1000), 
                                'level': self.level,
                                'event': 'script', 
                                'type': 'INFO', 
                                'data': msg})


    def start_test(self, data: running.TestCase, result):
        if data.tags.match('ev:*'):
           for tag in data.tags:
              if tag.startswith('ev:ommit'):
                 self.ommit = tag.split('ev:ommit:')[1].split(',')
                 

  
