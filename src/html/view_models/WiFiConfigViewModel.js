/* global $, ko */
/* exported WiFiConfigViewModel */

function WiFiConfigViewModel(baseEndpoint, config, status, scan) {
  "use strict";
  var self = this;

  self.baseEndpoint = baseEndpoint;
  self.config = config;
  self.status = status;
  self.scan = scan;

  self.scanUpdating = ko.observable(false);

  self.bssid = ko.observable("");
  self.bssid.subscribe(function (bssid) {
    for(var i = 0; i < self.scan.results().length; i++) {
      var net = self.scan.results()[i];
      if(bssid === net.bssid()) {
        self.config.ssid(net.ssid());
        return;
      }
    }
  });

  var scanTimer = null;
  var scanTime = 3 * 1000;

  // -----------------------------------------------------------------------
  // WiFi scan update
  // -----------------------------------------------------------------------
  var scanEnabled = false;
  self.startScan = function () {
    if (self.scanUpdating()) {
      return;
    }
    scanEnabled = true;
    self.scanUpdating(true);
    if (null !== scanTimer) {
      clearTimeout(scanTimer);
      scanTimer = null;
    }
    self.scan.update(function () {
      if(scanEnabled) {
        scanTimer = setTimeout(self.startScan, scanTime);
      }
      self.scanUpdating(false);
    });
  };

  self.stopScan = function() {
    scanEnabled = false;
    if (self.scanUpdating()) {
      return;
    }

    if (null !== scanTimer) {
      clearTimeout(scanTimer);
      scanTimer = null;
    }
  };

  self.wifiConnecting = ko.observable(false);
  self.status.mode.subscribe(function (newValue) {
    if(newValue === "STA+AP" || newValue === "AP") {
      self.startScan();
    } else {
      self.stopScan();
    }
  });
  self.status.wifi_client_connected.subscribe(function (newValue) {
    if(newValue) {
      self.wifiConnecting(false);
    }
  });

  // -----------------------------------------------------------------------
  // Event: WiFi Connect
  // -----------------------------------------------------------------------
  self.saveNetworkFetching = ko.observable(false);
  self.saveNetworkSuccess = ko.observable(false);
  self.saveNetwork = function () {
    if (self.config.ssid() === "") {
      alert("Please select network");
    } else {
      self.saveNetworkFetching(true);
      self.saveNetworkSuccess(false);
      $.post(self.baseEndpoint() + "/savenetwork", { ssid: self.config.ssid(), pass: self.config.pass() }, function () {
          self.saveNetworkSuccess(true);
          self.wifiConnecting(true);
        }).fail(function () {
          alert("Failed to save WiFi config");
        }).always(function () {
          self.saveNetworkFetching(false);
        });
    }
  };

  // -----------------------------------------------------------------------
  // Event: Turn off Access Point
  // -----------------------------------------------------------------------
  self.turnOffAccessPointFetching = ko.observable(false);
  self.turnOffAccessPointSuccess = ko.observable(false);
  self.turnOffAccessPoint = function () {
    self.turnOffAccessPointFetching(true);
    self.turnOffAccessPointSuccess(false);
    $.post(self.baseEndpoint() + "/apoff", {
    }, function (data) {
      console.log(data);
      if (self.status.ipaddress() !== "") {
        setTimeout(function () {
          window.location = "http://" + self.status.ipaddress();
          self.turnOffAccessPointSuccess(true);
        }, 3000);
      } else {
        self.turnOffAccessPointSuccess(true);
      }
    }).fail(function () {
      alert("Failed to turn off Access Point");
    }).always(function () {
      self.turnOffAccessPointFetching(false);
    });
  };
}
