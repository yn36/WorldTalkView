// pages/chat/chat.js
const io = require('../../utils/socket.js')
const app = getApp()

/**
 * 生成聊天室的系统消息
 */
function createSystemMessage(content) {
  return {
    id: msgUuid(),
    type: 'system',
    content
  }
}

/**
 * 生成聊天室的聊天消息
 */
function createUserMessage(content, user, isMe) {
  return {
    id: msgUuid(),
    type: 'speak',
    content,
    user: user.nickName,
    isMe,
    avatarUrl: user.avatarUrl
  }
}

/**
 * 生成一条聊天室的消息的唯一 ID
 */
function msgUuid() {
  if (!msgUuid.next) {
    msgUuid.next = 0
  }
  return 'msg-' + ++msgUuid.next
}

Page({

  /**
   * 页面的初始数据
   */
  data: {
    inputContent: null,
    messages: [],
    lastMessageId: 'none',
    numuser: 0
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function(options) {

  },

  /**
   * 通用更新当前消息集合的方法
   */
  updateMessages(updater) {
    var messages = this.data.messages
    updater(messages)

    this.setData({
      messages
    })

    // 需要先更新 messagess 数据后再设置滚动位置，否则不能生效
    var lastMessageId = messages.length ?
      messages[messages.length - 1].id :
      'none'
    this.setData({
      lastMessageId
    })
  },

  /**
   * 启动聊天室
   */
  enter() {
    this.pushMessage(createSystemMessage('正在登录...'))
    // 如果登录过，会记录当前用户在 this.me 上
    if (!this.me) {
      wx.getUserInfo({
        success: res => {
          this.me = res.userInfo
          this.createConnect()
        },
      })
    } else {
      this.createConnect()
    }
  },

  /**
   * 追加一条消息
   */
  pushMessage(message) {
    this.updateMessages(messages => messages.push(message))
  },

  /**
   * 替换上一条消息
   */
  amendMessage(message) {
    this.updateMessages(messages => messages.splice(-1, 1, message))
  },

  /**
   * 删除上一条消息
   */
  popMessage() {
    this.updateMessages(messages => messages.pop())
  },

  /**
   * 生命周期函数--监听页面初次渲染完成
   */
  onReady: function() {
    if (!this.pageReady) {
      this.pageReady = true
      this.enter()
    }
  },

  changeInputContent: function(e) {
    this.setData({
      inputContent: e.detail.value,
    })
  },

  sendMessage: function(e) {
    const msg = e.detail.value
    if (!msg) {
      return
    }
    const data = {
      msg,
      me: this.me
    }
    this.socket.emit('new message', data)
    this.pushMessage(createUserMessage(msg, this.me, 'isMe'))
    this.setData({
      inputContent: null
    })
  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow: function() {
    if (this.pageReady && !this.socket) {
      this.enter()
    }
  },

  /**
   * 生命周期函数--监听页面隐藏
   */
  onHide: function() {
    this.quit()
  },

  /**
   * 生命周期函数--监听页面卸载
   */
  onUnload() {
    this.quit()
  },

  // 离开
  quit() {
    this.socket.emit('out', this.me)

    setTimeout(() => {
      if (this.socket) {
        this.socket.close()
        this.socket = null
      }

      if (this.osocket) {
        this.osocket.close()
        this.osocket = null
      }
    }, 500)
  },

  /**
   * 页面相关事件处理函数--监听用户下拉动作
   */
  onPullDownRefresh: function() {

  },

  /**
   * 页面上拉触底事件的处理函数
   */
  onReachBottom: function() {

  },

  /**
   * 用户点击右上角分享
   */
  onShareAppMessage: function() {

  },

  createConnect: function(e) {
    this.amendMessage(createSystemMessage('正在加入群聊...'))

    const socket = (this.socket = io(
      'ws://193.112.144.28:3000',
    ))

    // 连接成功
    socket.on('connection', (msg) => {
      this.popMessage()
      this.pushMessage(createSystemMessage('连接成功'))
    })

    //重新连接
    socket.on('reconnect_attempt', () => {
      this.pushMessage(createSystemMessage('正在尝试重连'))
    })

    // 连接错误
    socket.on('error', err => {
      this.pushMessage(createSystemMessage(`error: ${err}`))
    })

    //添加用户
    socket.on('add user', msg => {
      const num = msg.numUsers
      console.log(msg,'add')
      this.setData({
        numuser: num + 1
      })
      this.pushMessage(createSystemMessage(`${msg.msg.nickName} 来了，当前共有 ${msg.numUsers} 人`))
    })

    //用户推出
    socket.on('out', (msg) => {
      console.log(msg)
      this.pushMessage(createSystemMessage(`${msg.msg.nickName} 离开了，当前共有 ${msg.numUsers } 人`))
    })

    // 接收用户信息
    socket.on('new message', (msg) => {
      this.pushMessage(createUserMessage(msg.msg, msg.me))
    })

    //发送用户
    socket.emit('add user', this.me)
  }
})