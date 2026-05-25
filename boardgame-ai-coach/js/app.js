/**
 * 桌游AI教练 - 应用入口模块
 * 负责页面挂载和路由初始化
 */

/**
 * 获取 TabBar HTML
 * 已登录店家：首页 / 游戏库 / AI / 我的
 * 未登录顾客：首页 / 游戏库 / AI / 关于
 * @param {string} activeTab - 当前激活的 Tab
 * @returns {string} TabBar HTML 字符串
 */
function getTabBarHtml(activeTab) {
    var loggedIn = window.isLoggedIn && window.isLoggedIn();

    var tabs = [
        { name: 'home', icon: '🏠', text: '首页' },
        { name: 'library', icon: '🎮', text: '游戏库' },
        { name: 'chat', icon: '🤖', text: 'AI' }
    ];

    if (loggedIn) {
        tabs.push({ name: 'profile', icon: '👤', text: '我的' });
    } else {
        tabs.push({ name: 'about', icon: 'ℹ️', text: '关于' });
    }

    var items = tabs.map(function(tab) {
        var isActive = activeTab === tab.name ? 'active' : '';
        return '<div class="tabbar-item ' + isActive + '" data-page="' + tab.name + '">' +
            '<span class="tabbar-icon">' + tab.icon + '</span>' +
            '<span class="tabbar-text">' + tab.text + '</span>' +
            '</div>';
    }).join('');

    return '<nav class="tabbar">' + items + '</nav>';
}

// 绑定 TabBar 点击事件
function bindTabBarEvents() {
    document.querySelectorAll('.tabbar-item').forEach(function(item) {
        item.addEventListener('click', function() {
            navigate('/' + this.dataset.page);
        });
    });
}

// 全局暴露，供页面重新渲染时使用
window.getTabBarHtml = getTabBarHtml;
window.bindTabBarEvents = bindTabBarEvents;
window.renderShopHeader = renderShopHeader;
window.getShopAppend = getShopAppend;

/**
 * 从URL中获取 shop 参数（支持 shop=xxx 和 shopId=xxx 两种 key）
 * @returns {string|null} shop UUID
 */
function getShopIdFromUrl() {
    var hash = window.location.hash || '';
    // 支持 shop=xxx 和 shopId=xxx 两种参数名
    var match = hash.match(/[?&]shop=([^&]+)/);
    if (!match) match = hash.match(/[?&]shopId=([^&]+)/);
    return match ? decodeURIComponent(match[1]) : null;
}

/**
 * 加载店家信息并缓存到全局
 */
async function loadShopInfo() {
    var shopId = getShopIdFromUrl();
    if (!shopId) {
        shopId = sessionStorage.getItem('shopId');
    }
    if (!shopId) {
        window._shopInfo = null;
        return;
    }

    // 如果已经加载过且shopId相同，跳过
    if (window._shopInfo && window._shopInfo.id === shopId) return;

    sessionStorage.setItem('shopId', shopId);
    console.log('[app.js] 加载店家信息, shopId:', shopId);

    try {
        var result = await window.getShopInfo(shopId);
        if (result.data) {
            window._shopInfo = result.data;
            console.log('[app.js] 店家信息加载成功:', result.data.name);
        } else {
            window._shopInfo = null;
            console.warn('[app.js] 店家信息加载失败:', result.error);
        }
    } catch (e) {
        window._shopInfo = null;
        console.error('[app.js] 加载店家信息异常:', e);
    }
}

/**
 * 渲染店家专属顶部标题栏
 * @returns {string} HTML 字符串
 */
function renderShopHeader() {
    var shopInfo = window._shopInfo;
    if (!shopInfo) return '';

    var logoHtml = shopInfo.logo_url ?
        '<img src="' + shopInfo.logo_url + '" style="width:24px;height:24px;border-radius:50%;vertical-align:middle;margin-right:8px;object-fit:cover;" onerror="this.style.display=\'none\'">' :
        '';

    var bgColor = shopInfo.theme_color || '#C4864B';

    return '<div class="shop-header" style="background:' + bgColor + ';color:#fff;font-size:16px;font-weight:bold;' +
        'text-align:center;padding:12px 16px;line-height:24px;box-shadow:0 1px 3px rgba(0,0,0,0.1);">' +
        logoHtml + (shopInfo.name || '桌游吧') +
        '</div>';
}

/**
 * 渲染页面内容
 * @param {string} pageName - 页面名称
 * @param {object} params - URL 参数对象
 * @param {string} [activeTab] - TabBar 高亮覆盖名（如 chat-list 页面高亮 chat 标签）
 */
function renderPageContent(pageName, params, activeTab) {
    var app = document.getElementById('app');
    if (!app) return;

    // 从 pages.js 注册的映射表中获取页面组件
    var page = window._pages[pageName];
    if (!page || typeof page.render !== 'function') {
        app.innerHTML = renderShopHeader() + '<div class="container"><h1>页面未找到: ' + pageName + '</h1></div>' + getTabBarHtml('home');
        return;
    }

    // 组合页面内容：全局店家标题栏 + 页面内容 + TabBar
    var content = page.render(params);
    var noTabBarPages = ['detail', 'chat'];
    var tabName = activeTab || pageName;
    var html = renderShopHeader() + content + (noTabBarPages.indexOf(pageName) === -1 ? getTabBarHtml(tabName) : '');
    app.innerHTML = html;

    // 绑定 TabBar 点击事件
    bindTabBarEvents();

    // 调用页面初始化方法
    if (typeof page.init === 'function') {
        page.init(params);
    }
}

/**
 * 认证守卫：检查是否需要跳转
 * @param {string} page - 页面名
 * @returns {boolean} 是否允许访问
 */
function authGuard(page) {
    var loggedIn = window.isLoggedIn && window.isLoggedIn();

    // profile 页面需要登录 → 未登录跳转到关于页（而非登录页）
    if (page === 'profile' && !loggedIn) {
        console.log('[app.js] 未登录，跳转到关于页面');
        window.location.hash = '/about';
        return false;
    }

    // auth 页面：已登录则跳转到 profile
    if (page === 'auth' && loggedIn) {
        console.log('[app.js] 已登录，跳转到个人中心');
        window.location.hash = '/profile';
        return false;
    }

    return true;
}

/**
 * 已登录时自动加载店家信息
 */
async function loadAuthShopInfo() {
    var loggedIn = window.isLoggedIn && window.isLoggedIn();
    if (!loggedIn) return;

    // 如果已经通过 URL shop 参数加载了店家信息，不覆盖
    if (window._shopInfo) return;

    try {
        if (window.authGetMe) {
            var me = await window.authGetMe();
            if (me) {
                window._shopInfo = {
                    id: me.id || me.store_id || '',
                    name: me.store_name || me.name || '我的桌游吧',
                    logo_url: me.logo_url || '',
                    theme_color: me.theme_color || '#C4864B'
                };
                sessionStorage.setItem('shopId', window._shopInfo.id);
                console.log('[app.js] 已登录店家:', window._shopInfo.name);
            }
        }
    } catch (e) {
        console.warn('[app.js] 自动加载店家信息失败:', e.message);
    }
}

/**
 * 初始化应用
 */
async function initApp() {
    // 初始化路由
    initRouter();

    // 先加载店家信息（从URL shop参数）
    await loadShopInfo();

    // 已登录店家自动加载信息
    await loadAuthShopInfo();

    // 路由到页面名的映射（/chat 无任何参数时映射到入口页）
    function resolvePage(route, params) {
        if (route === 'chat' && !params.id && !params.gameId && !params.mode) {
            return 'chat-list';
        }
        return route;
    }

    // 全局跳转辅助：从首页跳转到详情页时记录来源（供chat页返回使用）
    window.navigateToDetail = function(id, category) {
        if (id) {
            sessionStorage.setItem('chatFrom', '/detail?id=' + id);
        }
        if (category) {
            var recent = localStorage.getItem('recentCategories') || '';
            var cats = recent ? recent.split(',').filter(function(c) { return c !== category; }) : [];
            cats.unshift(category);
            localStorage.setItem('recentCategories', cats.slice(0, 5).join(','));
        }
        // 带上 shop 参数（如果有）
        var shopAppend = getShopAppend();
        window.location.hash = '/detail?id=' + encodeURIComponent(id) + shopAppend;
    };

    // 监听路由变化，渲染页面
    window.addEventListener('routechange', function(e) {
        var page = resolvePage(e.detail.page, e.detail.params);
        var currentHash = window.location.hash;

        // Bug 4 修复：进入 detail/chat 页面前保存来源页
        if (page === 'detail' || page === 'chat') {
            var prevPage = sessionStorage.getItem('currentMainPage') || '/home';
            sessionStorage.setItem('prevPageBeforeDetail', prevPage);
        } else {
            // 记录当前页作为"主页"（用于从 detail 返回）
            var hashWithoutParams = currentHash.split('?')[0];
            sessionStorage.setItem('currentMainPage', hashWithoutParams);
        }

        // 认证守卫
        if (!authGuard(page)) return;

        // 路由变化时也检查 shop 参数（可能从新URL中获取）
        var shopIdFromUrl = getShopIdFromUrl();
        if (shopIdFromUrl && (!window._shopInfo || window._shopInfo.id !== shopIdFromUrl)) {
            loadShopInfo().then(function() {
                var tabOverride = (page === 'chat-list') ? 'chat' : null;
                renderPageContent(page, e.detail.params, tabOverride);
            });
        } else {
            var tabOverride = (page === 'chat-list') ? 'chat' : null;
            renderPageContent(page, e.detail.params, tabOverride);
        }
    });

    // 渲染初始页面
    var hashInfo = parseHash(window.location.hash);
    var page = resolvePage(hashInfo.route || 'home', hashInfo.params);

    // 初始页面的认证守卫
    if (!authGuard(page)) return;

    var tabOverride = (page === 'chat-list') ? 'chat' : null;
    renderPageContent(page, hashInfo.params, tabOverride);
}

/**
 * 获取 shop 参数追加字符串（用于导航时保持 shop 参数）
 */
function getShopAppend() {
    var shopId = window._shopInfo ? window._shopInfo.id : null;
    if (!shopId) shopId = sessionStorage.getItem('shopId');
    return shopId ? '&shop=' + encodeURIComponent(shopId) : '';
}

/**
 * 「关于」页面 - 未登录顾客看到的第4个标签页
 * 显示 App 简介，底部提供店家登录入口（醒目按钮）
 */
App.registerPage('about', {
    render: function() {
        var shopAppend = getShopAppend();
        return '<div style="min-height:100vh;background:#F8F6F1;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:24px;text-align:center;">' +
            // 图标
            '<div style="font-size:64px;margin-bottom:20px;">🎲</div>' +
            // 标题
            '<div style="font-size:24px;font-weight:700;color:#2D2A26;margin-bottom:8px;">桌游AI教练</div>' +
            // 副标题
            '<div style="font-size:15px;color:#C4864B;margin-bottom:24px;">AI驱动的桌游教学助手</div>' +
            // 简介
            '<div style="max-width:300px;font-size:14px;color:#6B6258;line-height:1.8;margin-bottom:28px;">' +
            '扫码学习桌游规则，让桌游入门不再难</div>' +
            // 版本
            '<div style="font-size:12px;color:#B5AFA6;margin-bottom:36px;">v1.0</div>' +
            // 店家管理入口（醒目按钮区域）—— 仅未登录时显示
            '<div style="background:#FFFFFF;border:1px solid #E5E0D8;border-radius:12px;padding:20px 28px;margin-bottom:24px;max-width:300px;width:100%;box-shadow:0 2px 8px rgba(0,0,0,0.04);">' +
            '<div style="font-size:15px;font-weight:600;color:#2D2A26;margin-bottom:6px;">店家管理入口</div>' +
            '<div style="font-size:13px;color:#9B9488;margin-bottom:16px;">登录后管理您的桌游和规则</div>' +
            '<a href="#/auth' + shopAppend + '" style="display:inline-block;background:#C4864B;color:#FFFFFF;border:none;border-radius:20px;padding:10px 32px;font-size:14px;font-weight:500;text-decoration:none;cursor:pointer;">登录 / 注册</a>' +
            '</div>' +
            '</div>';
    },
    init: function() {}  // 无异步初始化
});

// 页面加载完成后初始化应用
document.addEventListener('DOMContentLoaded', initApp);
