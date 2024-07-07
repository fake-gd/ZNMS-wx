const app = getApp();

Page({
  data: {
    lockCode: ''
  },
  deviceConfig: {
    productKey: "k1h41jOvnlr",
    deviceName: "wechat",
    deviceSecret: "bac19ea7cc134d775ecb886155da6519",
    regionId: "cn-shanghai"
  },
  onInputLockCode(e) {
    this.setData({
      lockCode: e.detail.value // 获取输入的智能锁密码
    });
  },

  bindLock() {
    const lockCode = this.data.lockCode;
    const lockCodePattern = /^\d{4}$/; // 正则表达式，匹配四位数字
    if (lockCode && lockCodePattern.test(lockCode)) {
      app.globalData.lockPassword = lockCode; // 设置全局密码
      wx.setStorageSync('lockCode', lockCode); // 将密码保存到本地存储
      // 确保 MQTT 连接存在并且是有效的
      this.ensureMQTTConnection(() => {
        // 发布密码更新消息到云端
        this.publishPassword();
        wx.navigateBack(); // 返回到“我的”页面
      });
    } else {
      wx.showToast({
        title: '请输入有效的四位数字密码',
        icon: 'none'
      });
    }
  },

  ensureMQTTConnection(callback) {
    if (app.globalData.mqttClient && app.globalData.mqttClient.connected) {
      callback();
    } else {
      console.log('MQTT客户端未连接，尝试连接...');
      this.connectMQTT(callback);
    }
  },

  connectMQTT(callback) {
    if (app.globalData.mqttClientConnecting) {
      console.log('MQTT正在连接中，等待连接完成...');
      setTimeout(() => {
        this.connectMQTT(callback);
      }, 1000);
      return;
    }

    app.globalData.mqttClientConnecting = true; // 标记正在连接，避免重复连接

    const options = this.initMqttOptions(this.deviceConfig);
    const mqttClient = mqtt.connect(`wxs://${this.deviceConfig.productKey}.iot-as-mqtt.${this.deviceConfig.regionId}.aliyuncs.com`, options);

    mqttClient.on('connect', () => {
      console.log('MQTT连接成功');
      app.globalData.mqttClient = mqttClient;
      app.globalData.mqttClientConnecting = false;
      // 连接成功后进行订阅等操作
      this.subscribeToTopics();
      callback();
    });

    mqttClient.on('error', (error) => {
      console.error('MQTT连接错误:', error);
      app.globalData.mqttClientConnecting = false;
      this.retryConnection(callback);
    });

    mqttClient.on('offline', () => {
      console.log('MQTT客户端离线，尝试重连');
      app.globalData.mqttClientConnecting = false;
      this.retryConnection(callback);
    });
  },

  retryConnection(callback) {
    // 重试连接逻辑，例如延时后重新调用 connectMQTT()
    setTimeout(() => {
      this.connectMQTT(callback);
    }, 5000); // 5秒后重试
  },

  subscribeToTopics() {
    const topic = '/k1h41jOvnlr/wechat/user/get';
    app.globalData.mqttClient.subscribe(topic, (err) => {
      if (!err) {
        console.log('订阅成功');
      } else {
        console.error('订阅失败:', err);
      }
    });
  },

  publishPassword() {
    const password = String(app.globalData.lockPassword || wx.getStorageSync('lockPassword'));
    console.log('发送的密码:', password);  // 调试输出，检查密码值
    if (app.globalData.mqttClient && app.globalData.mqttClient.connected) {
      const topic = `/sys/${this.deviceConfig.productKey}/${this.deviceConfig.deviceName}/thing/event/property/post`;
      const message = JSON.stringify({
        id: Date.now(),
        version: '1.0',
        params: {
          password: password // 发送新密码
        },
        method: "thing.event.property.post"
      });
      app.globalData.mqttClient.publish(topic, message, function (err) {
        if (err) {
          console.error('发布密码更新消息失败：', err);
        } else {
          console.log('密码更新消息成功发送');
          // 不需要断开 MQTT 连接，因为是全局变量管理，会在合适的时机结束连接
        }
      });
    } else {
      console.error('MQTT客户端未连接，无法发送密码更新');
    }
  },

  initMqttOptions: function(deviceConfig) {
    const params = {
      productKey: deviceConfig.productKey,
      deviceName: deviceConfig.deviceName,
      timestamp: Date.now(),
      clientId: Math.random().toString(36).substr(2)
    };
    const options = {
      keepalive: 60,
      clean: true,
      protocolVersion: 4
    };
    options.password = this.signHmacSha1(params, deviceConfig.deviceSecret);
    options.clientId = `${params.clientId}|securemode=2,signmethod=hmacsha1,timestamp=${params.timestamp}|`;
    options.username = `${params.deviceName}&${params.productKey}`;
    return options;
  },

  signHmacSha1: function(params, deviceSecret) {
    let keys = Object.keys(params).sort();
    const list = [];
    keys.map((key) => {
      list.push(`${key}${params[key]}`);
    });
    const contentStr = list.join('');
    return crypto.hex_hmac_sha1(deviceSecret, contentStr);
  }
});
