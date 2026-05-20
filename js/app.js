/**
 * 桌游AI教练 - 应用入口模块
 * 负责页面挂载和路由初始化
 */

/**
 * 获取 TabBar HTML
 * @param {string} currentPage - 当前页面名称
 * @returns {string} TabBar HTML 字符串
 */
function getTabBar(currentPage) {
    const tabs = [
        { name: 'home', icon: '🏠', text: '首页' },
        { name: 'search', icon: '🎲', text: '游戏库' },
        { name: 'chat', icon: '🤖', text: 'AI' },
        { name: 'guide', icon: '👤', text: '我的' }
    ];

    const items = tabs.map(tab => {
        const isActive = currentPage === tab.name ? 'active' : '';
        return `<div class="tabbar-item ${isActive}" data-page="${tab.name}">
            <span class="tabbar-icon">${tab.icon}</span>
            <span class="tabbar-text">${tab.text}</span>
        </div>`;
    }).join('');

    return `<nav class="tabbar">${items}</nav>`;
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
window.getTabBarHtml = getTabBar;
window.bindTabBarEvents = bindTabBarEvents;

/**
 * 渲染页面内容
 * @param {string} pageName - 页面名称
 * @param {object} params - URL 参数对象
 */
function renderPageContent(pageName, params) {
    console.log('[DEBUG] renderPageContent 被调用, page:', pageName);
    var app = document.getElementById('app');
    if (!app) return;

    // 从 pages.js 注册的映射表中获取页面组件
    var page = window._pages[pageName];
    console.log('[DEBUG] page 对象:', page);
    console.log('[DEBUG] page.init 类型:', typeof (page && page.init));
    if (!page || typeof page.render !== 'function') {
        app.innerHTML = '<div class="container"><h1>页面未找到: ' + pageName + '</h1></div>' + getTabBar('home');
        return;
    }

    // 组合页面内容和 TabBar（部分页面不需要 TabBar）
    var content = page.render(params);
    var noTabBarPages = ['detail', 'chat'];
    var html = content + (noTabBarPages.indexOf(pageName) === -1 ? getTabBar(pageName) : '');
    app.innerHTML = html;

    // 绑定 TabBar 点击事件
    bindTabBarEvents();

    // 调用页面初始化方法
    if (typeof page.init === 'function') {
        page.init(params);
    }
}

/**
 * 初始化应用
 */
function initApp() {
    console.log('[app.js] ★★★ initApp() 函数被调用! ★★★');
    console.log('[DEBUG] window.parseHash:', typeof window.parseHash);
    console.log('[DEBUG] window._pages:', Object.keys(window._pages || {}));
    console.log('[DEBUG] window.location.hash:', window.location.hash);
    // 初始化路由
    initRouter();

    // 监听路由变化，渲染页面
    window.addEventListener('routechange', function(e) {
        renderPageContent(e.detail.page, e.detail.params);
    });

    // 渲染初始页面
    var hashInfo = parseHash(window.location.hash);
    renderPageContent(hashInfo.route || 'home', hashInfo.params);
}

// 页面加载完成后初始化应用
document.addEventListener('DOMContentLoaded', initApp);
