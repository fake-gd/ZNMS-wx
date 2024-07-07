var mqtt = require('../../utils/mqtt.min.js'); //根据自己存放的路径修改
const crypto = require('../../utils/hex_hmac_sha1.js'); //根据自己存放的路径修改
const app = getApp();

Page({
  data: {
    lockStatus: '关',
    records: [],
    isConnecting: false
  },
  deviceConfig: {
    productKey: "k1h41jOvnlr",
    deviceName: "wechat",
    deviceSecret: "bac19ea7cc134d775ecb886155da6519",
    regionId: "cn-shanghai"
  },
  
  onLoad: function () {
    this.connectMqttClient(); // 初始化MQTT连接
  },
  pass: function() {
    const password = app.globalData.lockPassword;  // 从全局数据中获取lockPassword
    console.log(password);  // 打印密码
  },
  connectMqttClient: function () {
    if (this.data.isConnecting || (app.globalData.mqttClient && app.globalData.mqttClient.connected)) {
      console.log('已经在连接中或已连接，无需重复连接');
      return;
    }

    this.setData({ isConnecting: true });
    const options = this.initMqttOptions(this.deviceConfig);
    const mqttClient = mqtt.connect(`wxs://${this.deviceConfig.productKey}.iot-as-mqtt.${this.deviceConfig.regionId}.aliyuncs.com`, options);

    mqttClient.on('connect', () => {
      console.log('连接服务器成功');
      this.setData({ isConnecting: false });
      app.globalData.mqttClient = mqttClient; // 保存到全局变量
      mqttClient.subscribe('/k1h41jOvnlr/wechat/user/get', (err) => {
        if (!err) {
          console.log('订阅成功');
        } else {
          console.error('订阅失败:', err);
        }
      });
    });

    mqttClient.on('message', (topic, message) => {
      console.log('收到消息：', topic, message.toString());
      if (topic === '/k1h41jOvnlr/wechat/user/get') {
        this.handleLockMessage(message.toString());
      }
    });

    mqttClient.on('close', () => {
      console.log('MQTT连接已关闭，尝试重连');
      this.setData({ isConnecting: false });
      this.retryConnection();
    });

    mqttClient.on('error', (error) => {
      console.error('连接错误：', error);
      this.setData({ isConnecting: false });
      this.retryConnection();
    });

    mqttClient.on('offline', () => {
      console.log('MQTT客户端离线，尝试重连');
      this.setData({ isConnecting: false });
      this.retryConnection();
    });

    this.setData({
      mqttClient: mqttClient
    });
  },

  retryConnection: function() {
    // 在尝试重新连接之前等待一段时间，防止频繁重连
    setTimeout(() => {
      this.connectMqttClient();
    }, 5000); // 5秒后重试
  },

  handleLockMessage: function (message) {
    try {
      const parsedMessage = JSON.parse(message);
      const value = parsedMessage.items.mark.value;
      let newStatus = '';

      if (value === 1) {
        newStatus = '开';
      } else if (value === 0) {
        newStatus = '关';
      } else {
        console.warn('未知的 mark 值:', value);
        return;
      }

      const previousStatus = this.data.lockStatus;

      // 仅当状态变化时才更新状态和记录
      if (newStatus !== previousStatus) {
        const newRecord = `锁已${newStatus} - ${new Date().toLocaleString()}`;
        this.setData({
          lockStatus: newStatus,
          records: [newRecord, ...this.data.records]
        });
        console.log(`添加${newStatus === '开' ? '开' : '关'}锁记录:`, newRecord);
      }
    } catch (e) {
      console.error('解析消息失败:', e);
    }
  },

  toggleLock: function() {
    // 计算将要发送到阿里云的状态
    const requestedStatus = this.data.lockStatus === '开' ? 0 : 1; // 发送相反的状态请求
    this.publishUnlockStatus(requestedStatus); // 发送请求到阿里云
    wx.showToast({
      title: '发送请求中...',
      icon: 'loading',
      duration: 1000
    });
  },
  
  publishUnlockStatus: function(isLocked) {
    const mqttClient = app.globalData.mqttClient;
    if (mqttClient && mqttClient.connected) {
      const topic = `/sys/${this.deviceConfig.productKey}/${this.deviceConfig.deviceName}/thing/event/property/post`;
      const message = JSON.stringify({
        id: Date.now(),
        version: '1.0',
        params: {
          Lock: isLocked ? 1 : 0,
        },
        method: "thing.event.property.post"
      });
      mqttClient.publish(topic, message, function(err) {
        if (err) {
          console.error('发布消息失败：', err);
        } else {
          console.log('发布消息成功');
        }
      });
    } else {
      console.error('MQTT客户端未连接，尝试重连');
      this.connectMqttClient();
    }
  },

  showRecords: function() {
    const records = this.data.records;
    wx.navigateTo({
      url: '/pages/records/records',
      success: function(res) {
        res.eventChannel.emit('sendRecords', { records: records });
        res.eventChannel.on('clearRecords', () => {
          this.setData({
            records: []
          });
        });
      }.bind(this),
      fail: function(err) {
        console.error('导航到记录页面失败', err);
      }
    });
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
