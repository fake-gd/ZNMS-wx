Page({
  data: {
    records: []
  },

  onLoad: function(options) {
    const eventChannel = this.getOpenerEventChannel();
    eventChannel.on('sendRecords', (data) => {
      this.setData({
        records: data.records
      });
    });
  },

  goBack: function() {
    wx.navigateBack();
  },

  clearRecords: function() {
    this.setData({
      records: []
    });
    const eventChannel = this.getOpenerEventChannel();
    eventChannel.emit('clearRecords');
  }
});