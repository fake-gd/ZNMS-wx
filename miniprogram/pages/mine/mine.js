Page({
  data: {
    isLoggedIn: false,
    user: {},
    lockCode: '', // 添加用于存储智能锁代号的字段
    relativePhotos: [] // 用于存储亲属照片的数组
  },
  onShow() { // 使用 onShow 以确保每次显示页面时都会执行
    // 检查用户是否已登录
    const user = wx.getStorageSync('currentUser'); // 获取当前登录的用户信息
    if (user) {
      this.setData({
        isLoggedIn: true,
        user: user
      });

      // 获取绑定的智能锁代号
      const lockCode = wx.getStorageSync('lockCode'); // 假设智能锁代号保存在本地存储中
      if (lockCode) {
        this.setData({
          lockCode: lockCode
        });
      }
    } else {
      this.setData({
        isLoggedIn: false,
        user: {},
        lockCode: '' // 未登录时清空智能锁代号
      });
    }
  },
  handleLogin() {
    wx.navigateTo({
      url: '/pages/login/login' // 跳转到登录页面
    });
  },
  handleLogout() {
    // 处理退出登录
    wx.removeStorageSync('currentUser'); // 清除当前登录的用户信息
    wx.removeStorageSync('lockCode'); // 清除绑定的智能锁代号
    this.setData({
      isLoggedIn: false,
      user: {},
      lockCode: '' // 清空智能锁代号
    });
  },
  handleBindLock() {
    wx.navigateTo({
      url: '/pages/bindlock/bindlock' // 跳转到绑定智能门锁页面
    });
  },
});