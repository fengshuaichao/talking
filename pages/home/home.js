/* eslint-disable no-param-reassign */
import { getHomeSwiper } from '../../services/home/home';
import { listGood, getPrice } from '../../services/good/spu';
import { getCloudImageTempUrl } from '../../utils/cloudImageHandler';
import { LIST_LOADING_STATUS } from '../../utils/listLoading';

Page({
  data: {
    imgSrcs: [], // 轮播图图片地址数组
    tabList: [], // 选项卡列表
    goodsList: [], // 商品列表数据
    goodsListLoadStatus: LIST_LOADING_STATUS.READY, // 商品列表加载状态
    pageLoading: false, // 页面加载状态
    current: 1, // 当前轮播图索引
    autoplay: true, // 是否自动播放轮播图
    duration: '500', // 轮播图切换动画时长（毫秒）
    interval: 5000, // 轮播图自动切换间隔（毫秒）
    navigation: { type: 'dots' }, // 轮播图导航样式，使用点状
    swiperImageProps: { mode: 'scaleToFill' } // 轮播图图片填充模式
  },

  // 商品列表分页配置
  goodListPagination: {
    index: 1, // 当前页码
    num: 20, // 每页显示数量
  },

  // 私有数据
  privateData: {
    tabIndex: 0, // 当前选中的选项卡索引
  },

  // 页面显示时触发
  onShow() {
    this.getTabBar().init(); // 初始化底部导航栏
  },

  // 页面加载时触发
  onLoad() {
    this.init();
  },

  // 页面上拉触底时触发
  onReachBottom() {
    if (this.data.goodsListLoadStatus === LIST_LOADING_STATUS.READY) {
      this.loadGoodsList(); // 加载更多商品
    }
  },

  // 下拉刷新触发
  onPullDownRefresh() {
    this.init();
  },

  // 页面初始化
  async init() {
    wx.stopPullDownRefresh(); // 停止下拉刷新动画

    this.setData({
      pageLoading: false,
    });

    this.loadGoodsList(true); // 重新加载商品列表
    this.loadHomeSwiper(); // 加载轮播图数据
  },

  // 加载首页轮播图
  async loadHomeSwiper() {
    const { images } = await getHomeSwiper(); // 从服务器获取轮播图数据
    const handledImages = await getCloudImageTempUrl(images); // 获取云存储图片的临时访问地址

    this.setData({ imgSrcs: handledImages });
  },

  // 加载失败后重试
  onReTry() {
    this.loadGoodsList();
  },

  // 加载商品列表
  async loadGoodsList(fresh = false) {
    if (fresh) {
      wx.pageScrollTo({
        scrollTop: 0, // 刷新时滚动到顶部
      });
    }

    this.setData({ goodsListLoadStatus: LIST_LOADING_STATUS.LOADING }); // 设置加载状态

    const pageSize = this.goodListPagination.num;
    const pageIndex = fresh ? 1 : this.goodListPagination.num; // 刷新时重置页码

    try {
      // 获取商品列表数据
      const { records: nextList, total } = await listGood({ pageNumber: pageIndex, pageSize });
      // 提取商品封面图片
      const images = nextList.map((x) => x.cover_image);
      // 获取云存储图片的临时访问地址
      const handledImages = await getCloudImageTempUrl(images);
      // 更新商品列表中的图片地址
      handledImages.forEach((image, index) => (nextList[index].cover_image = image));
      // 获取每个商品的价格
      await Promise.all(nextList.map(async (spu) => (spu.price = await getPrice(spu._id).catch(() => 0.01))));

      // 更新商品列表数据
      const goodsList = fresh ? nextList : this.data.goodsList.concat(nextList);

      this.setData({
        goodsList,
        // 根据是否还有更多数据设置加载状态
        goodsListLoadStatus: goodsList.length >= total ? LIST_LOADING_STATUS.NO_MORE : LIST_LOADING_STATUS.READY,
      });

      // 更新分页信息
      this.goodListPagination.index = pageIndex + 1;
      this.goodListPagination.num = pageSize;
    } catch (err) {
      console.error('error', err);
      this.setData({ goodsListLoadStatus: LIST_LOADING_STATUS.FAILED }); // 设置加载失败状态
    }
  },

  // 商品点击事件处理
  goodListClickHandle(e) {
    const spuId = e?.detail?.goods?._id;
    if (typeof spuId !== 'string') return;
    wx.navigateTo({
      url: `/pages/goods/details/index?spuId=${spuId}`, // 跳转到商品详情页
    });
  },

  // 添加购物车事件处理
  goodListAddCartHandle(e) {
    const spuId = e?.detail?.goods?._id;
    if (typeof spuId !== 'string') return;
    wx.navigateTo({
      url: `/pages/goods/details/index?spuId=${spuId}`, // 跳转到商品详情页
    });
  },

  // 跳转到搜索页面
  navToSearchPage() {
    wx.navigateTo({ url: '/pages/goods/search/index' });
  },

  // 跳转到活动详情页
  navToActivityDetail({ detail }) {
    const { index: promotionID = 0 } = detail || {};
    wx.navigateTo({
      url: `/pages/promotion-detail/index?promotion_id=${promotionID}`,
    });
  }
});
