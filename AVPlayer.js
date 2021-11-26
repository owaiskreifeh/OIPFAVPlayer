function AVPlayer(src, laURL) {
  this._src = src;
  this._laURL = laURL;
  this._mediaElement = AVPlayer.createPlayerObject();
  this._drmAgent = AVPlayer.createDrmAgent();

  // info
  this._state = AVPlayer.PLAY_STATE_STOPPED;
  this.duration = 0;
  this.currentTime = 0;
  this.buffered = {
    length: 0,
    start: function (index) {
      return 0;
    },
    end: function (index) {
      return this.currentTime;
    },
  };
  this.volume = 1;
  this.muted = false;
  this.paused = false;
  this.ended = false;
  this.error = null;
  this.readyState = 0;

  // events
  this.onPlayStateChange = null;
  log("AVPlayer: ", this._mediaElement);
  this._mediaElement.onPlayStateChange = function (state) {
    this._state = state;
    this.duration = this._mediaElement.playTime / 1000;
    this.currentTime = this._mediaElement.playPosition / 1000;
    this.volume = this._mediaElement.getVolume();
    this.muted = this._mediaElement.getMuted();
    this.error = null;

    if (this.onPlayStateChange) {
      this.onPlayStateChange(state);
    }
    switch (state) {
      case AVPlayer.PLAY_STATE_STOPPED:
        this.paused = true;
        this.ended = true;
        break;
      case AVPlayer.PLAY_STATE_PLAYING:
        this.readyState = 4;
        this.paused = false;
        this.ended = false;
        break;
      case AVPlayer.PLAY_STATE_PAUSED:
        this.paused = true;
        this.ended = false;
        break;
      case AVPlayer.PLAY_STATE_BUFFERING:
        this.readyState = 3;
        this.paused = false;
        this.ended = false;
        break;
      case AVPlayer.PLAY_STATE_ERROR:
        this.paused = true;
        this.ended = false;
        this.error = this._mediaElement.error;
        break;
      case AVPlayer.PLAY_STATE_FINISHED:
        this.paused = true;
        this.ended = true;
        break;
      default:
        this.paused = true;
        this.ended = false;
        break;
    }
  };

  // methods

  this.getMediaElement = function () {
    return this._mediaElement;
  };

  this._setProtectionData = function (licenseServerURL, callback) {
    var msgType = "application/vnd.ms-playready.initiator+xml";
    var DRMSysID = "urn:dvb:casystemid:19219";
    var xmlLicenseAcquisition =
      AVPlayer.generatePlayreadyRequestXML(licenseServerURL);

    try {
      this._drmAgent.onDRMMessageResult = function (
        msgType,
        resultMsg,
        resultCode
      ) {
        this.drmMsgHandler(msgType, resultMsg, resultCode, callback);
      };
    } catch (e) {
      log("setProtectionData Error 1: " + e.message);
    }
    try {
      this._drmAgent.onDRMRightsError = drmRightsErrorHandler;
    } catch (e) {
      log("setProtectionData Error 2: " + e.message);
    }
    try {
      this._drmAgent.sendDRMMessage(msgType, xmlLicenseAcquisition, DRMSysID);
    } catch (e) {
      log("setProtectionData Error 3: " + e.message);
    }
  };

  this.setSource = function (src) {
    this._src = src;
  };

  this.setLaURL = function (laURL) {
    this._laURL = laURL;
  };

  this.load = function (autoPlay) {
    if (this._laURL) {
      this._setProtectionData(this._laURL, function () {
        this._mediaElement.setSource(this._src);
        if (autoPlay) {
          this.play();
        }
      });
    } else {
      this._mediaElement.setSource(this._src);
      if (autoPlay) {
        this.play();
      }
    }
  };

  // control methods
  this.play = function () {
    switch (this._state) {
      case AVPlayer.PLAY_STATE_PLAYING:
      case AVPlayer.PLAY_STATE_BUFFERING:
        break;
      case AVPlayer.PLAY_STATE_PAUSED:
      case AVPlayer.PLAY_STATE_STOPPED:
      case AVPlayer.PLAY_STATE_FINISHED:
        this._mediaElement.play(1);
        break;
      default:
        throw (
          "Cannot resume while in the '" +
          AVPlayer.getPlayStateStringFromCode(this._state) +
          "' state"
        );
    }
  };

  this.pause = function () {
    switch (this._state) {
      case AVPlayer.PLAY_STATE_PLAYING:
      case AVPlayer.PLAY_STATE_BUFFERING:
        this._mediaElement.play(0);
        break;
      case AVPlayer.PLAY_STATE_PAUSED:
        break;
      default:
        throw (
          "Cannot pause while in the '" +
          AVPlayer.getPlayStateStringFromCode(this._state) +
          "' state"
        );
    }
  };

  this.stop = function () {
    switch (this._state) {
      case AVPlayer.PLAY_STATE_PLAYING:
      case AVPlayer.PLAY_STATE_BUFFERING:
      case AVPlayer.PLAY_STATE_PAUSED:
      case AVPlayer.PLAY_STATE_FINISHED:
        this._mediaElement.stop();
        break;
      case AVPlayer.PLAY_STATE_STOPPED:
        break;
      default:
        throw (
          "Cannot stop while in the '" +
          AVPlayer.getPlayStateStringFromCode(this._state) +
          "' state"
        );
    }
  };

  this.destroy = function () {
    this.stop();
    this._mediaElement.data = null;
    this._setProtectionData(null, null);
  };
}

AVPlayer.PLAY_STATE_STOPPED = 0;
AVPlayer.PLAY_STATE_PLAYING = 1;
AVPlayer.PLAY_STATE_PAUSED = 2;
AVPlayer.PLAY_STATE_CONNECTING = 3;
AVPlayer.PLAY_STATE_BUFFERING = 4;
AVPlayer.PLAY_STATE_FINISHED = 5;
AVPlayer.PLAY_STATE_ERROR = 6;

AVPlayer.CONTENT_TYPE_VIDEO = 0;
AVPlayer.CONTENT_TYPE_AUDIO = 1;
AVPlayer.CONTENT_TYPE_SUBTITLE = 2;

AVPlayer.getPlayStateStringFromCode = function (code) {
  switch (code) {
    case AVPlayer.PLAY_STATE_STOPPED:
      return "STOPPED";
    case AVPlayer.PLAY_STATE_PLAYING:
      return "PLAYING";
    case AVPlayer.PLAY_STATE_PAUSED:
      return "PAUSED";
    case AVPlayer.PLAY_STATE_CONNECTING:
      return "CONNECTING";
    case AVPlayer.PLAY_STATE_BUFFERING:
      return "BUFFERING";
    case AVPlayer.PLAY_STATE_FINISHED:
      return "FINISHED";
    case AVPlayer.PLAY_STATE_ERROR:
      return "ERROR";
    default:
      return "UNKNOWN";
  }
};

AVPlayer.createPlayerObject = function () {
  if (window.oipfObjectFactory) {
    return oipfObjectFactory.createVideoMpegObject();
  } else {
    var playerElement = document.createElement("object");
    playerElement.setAttribute("type", "video/mpeg");
    return playerElement;
  }
};

AVPlayer.createDrmAgent = function () {
  if (window.oipfObjectFactory) {
    return oipfObjectFactory.createDrmAgentObject();
  } else {
    var drmAgent = document.createElement("object");
    drmAgent.setAttribute("type", "application/oipfDrmAgent");
    return drmAgent;
  }
};

AVPlayer.generatePlayreadyRequestXML = function (laURL) {
  var xml =
    '<?xml version="1.0" encoding="utf-8"?>' +
    "<PlayReadyRequest>" +
    "<LicenseAcquisition>" +
    "<LA_URL>" +
    laURL +
    "</LA_URL>" +
    "</LicenseAcquisition>" +
    "</PlayReadyRequest>";
  return xml;
};

// DRM Agent Event Handlers
AVPlayer.prototype.drmMsgHandler = function (
  msgID,
  resultMsg,
  resultCode,
  callback
) {
  log("msgID, resultMsg, resultCode: ", msgID, ",", resultMsg, ",", resultCode);
  var errorMessage = "";
  switch (resultCode) {
    case 0:
      if (callback) {
        callback();
      }
      break;
    case 1:
      errorMessage = "DRM: Unspecified error";
      break;
    case 2:
      errorMessage = "DRM: Cannot process request";
      break;
    case 3:
      errorMessage = "DRM: Wrong format";
      break;
    case 4:
      errorMessage = "DRM: User Consent Needed";
      break;
    case 5:
      errorMessage = "DRM: Unknown DRM system";
      break;
  }

  if (resultCode > 0) {
    log("ERROR: ", errorMessage);
  }
};

AVPlayer.prototype.drmRightsErrorHandler = function (errorCode, errorMsg) {
  var errorMessage = "";
  switch (resultCode) {
    case 0:
      errorMessage = "DRM: No license error";
      break;
    case 1:
      errorMessage = "DRM: Invalid license error";
      break;
    case 2:
      errorMessage = "license valid";
      break;
  }
  log("ERROR: ", errorMessage);
};



// utils
function log() {
  if (window.console) {
    console.log.apply(console, arguments);
  }
}

function debounce(func, wait, immediate) {
  var timeout;
  return function () {
    var context = this,
      args = arguments;
    var later = function () {
      timeout = null;
      if (!immediate) func.apply(context, args);
    };
    var callNow = immediate && !timeout;
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
    if (callNow) func.apply(context, args);
  };
}

function throttle(func, wait, options) {
  var context, args, result;
    var timeout = null;
    var previous = 0;
    if (!options) options = {};
    var later = function() {
        previous = options.leading === false ? 0 : Date.now();
        timeout = null;
        result = func.apply(context, args);
        if (!timeout) context = args = null;
        }
    return function() {
        var now = Date.now();
        if (!previous && options.leading === false) previous = now;
        var remaining = wait - (now - previous);
        context = this;
        args = arguments;
        if (remaining <= 0 || remaining > wait) {
            if (timeout) {
                clearTimeout(timeout);
                timeout = null;
            }
            previous = now;
            result = func.apply(context, args);
            if (!timeout) context = args = null;
        } else if (!timeout && options.trailing !== false) {
            timeout = setTimeout(later, remaining);
        }
        return result;
    }
}

