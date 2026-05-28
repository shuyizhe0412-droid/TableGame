/**
 * 桌游AI教练 - 店家认证页（登录/注册）
 */
console.log('[auth.js] 文件开始加载');

App.registerPage('auth', (function() {
    var state = {
        mode: 'login',   // 'login' | 'register'
        email: '',
        password: '',
        storeName: '',
        errorMsg: '',
        isLoading: false
    };

    function escapeHtml(str) {
        if (!str) return '';
        return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    // ==================== 渲染函数 ====================

    function render() {
        var isLogin = state.mode === 'login';
        var title = isLogin ? '店家登录' : '店家注册';
        var subtitle = isLogin ? '登录后管理您的桌游' : '创建账号，开始管理桌游';
        var submitText = isLogin ? '登 录' : '注 册';
        var toggleText = isLogin ? '还没有账号？立即注册' : '已有账号？立即登录';
        var toggleAction = isLogin ? 'authPage.switchToRegister()' : 'authPage.switchToLogin()';

        var errorHtml = state.errorMsg ?
            '<div style="background:#FFF0F0;color:#D32F2F;padding:10px 14px;border-radius:8px;font-size:13px;margin-bottom:16px;">' +
            escapeHtml(state.errorMsg) + '</div>' : '';

        return '<div style="min-height:100vh;background:#F8F6F1;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:24px;">' +
            // Logo
            '<div style="text-align:center;margin-bottom:32px;">' +
            '<div style="font-size:48px;margin-bottom:12px;">🎲</div>' +
            '<div style="font-size:22px;font-weight:700;color:#2D2A26;">' + title + '</div>' +
            '<div style="font-size:14px;color:#8C8578;margin-top:6px;">' + subtitle + '</div>' +
            '</div>' +
            // 表单卡片
            '<div style="background:#FFFFFF;border-radius:16px;padding:24px;width:100%;max-width:360px;box-shadow:0 2px 12px rgba(0,0,0,0.06);">' +
            errorHtml +
            // 邮箱
            '<div style="margin-bottom:16px;">' +
            '<label style="display:block;font-size:13px;color:#4A4540;margin-bottom:6px;font-weight:500;">📧 邮箱</label>' +
            '<input type="email" id="auth-email" value="' + escapeHtml(state.email) + '" ' +
            'placeholder="请输入邮箱" ' +
            'style="width:100%;padding:12px 14px;border:1px solid #E5E0D8;border-radius:10px;font-size:14px;' +
            'color:#2D2A26;background:#F8F6F1;outline:none;box-sizing:border-box;transition:border 0.2s;" ' +
            'onfocus="this.style.borderColor=\'#C4864B\'" onblur="this.style.borderColor=\'#E5E0D8\'">' +
            '</div>' +
            // 密码
            '<div style="margin-bottom:' + (isLogin ? '20' : '16') + 'px;">' +
            '<label style="display:block;font-size:13px;color:#4A4540;margin-bottom:6px;font-weight:500;">🔒 密码</label>' +
            '<input type="password" id="auth-password" ' +
            'placeholder="请输入密码（至少6位）" ' +
            'style="width:100%;padding:12px 14px;border:1px solid #E5E0D8;border-radius:10px;font-size:14px;' +
            'color:#2D2A26;background:#F8F6F1;outline:none;box-sizing:border-box;transition:border 0.2s;" ' +
            'onfocus="this.style.borderColor=\'#C4864B\'" onblur="this.style.borderColor=\'#E5E0D8\'">' +
            '</div>' +
            // 店名（仅注册显示）
            (!isLogin ? '<div style="margin-bottom:20px;">' +
            '<label style="display:block;font-size:13px;color:#4A4540;margin-bottom:6px;font-weight:500;">🏪 店铺名称</label>' +
            '<input type="text" id="auth-store-name" value="' + escapeHtml(state.storeName) + '" ' +
            'placeholder="请输入店铺名称" ' +
            'style="width:100%;padding:12px 14px;border:1px solid #E5E0D8;border-radius:10px;font-size:14px;' +
            'color:#2D2A26;background:#F8F6F1;outline:none;box-sizing:border-box;transition:border 0.2s;" ' +
            'onfocus="this.style.borderColor=\'#C4864B\'" onblur="this.style.borderColor=\'#E5E0D8\'">' +
            '</div>' : '') +
            // 提交按钮
            '<button id="auth-submit-btn" onclick="authPage.submit()" ' +
            'style="width:100%;padding:13px 0;background:#C4864B;color:#FFFFFF;border:none;border-radius:10px;' +
            'font-size:15px;font-weight:600;cursor:pointer;transition:background 0.2s;" ' +
            'onmouseenter="this.style.background=\'#B0763B\'" onmouseleave="this.style.background=\'#C4864B\'"' +
            (state.isLoading ? 'disabled' : '') + '>' +
            (state.isLoading ? '处理中...' : submitText) +
            '</button>' +
            // 切换
            '<div style="text-align:center;margin-top:16px;">' +
            '<span onclick="' + toggleAction + '" style="font-size:13px;color:#C4864B;cursor:pointer;">' + toggleText + '</span>' +
            '</div>' +
            '</div>' +
            // 返回首页
            '<div style="margin-top:24px;">' +
            '<span onclick="window.location.hash=\'/\'" style="font-size:13px;color:#8C8578;cursor:pointer;">← 返回首页</span>' +
            '</div>' +
            '</div>';
    }

    // ==================== 事件处理 ====================

    function init() {
        state.errorMsg = '';
        state.isLoading = false;
        // 如果已登录，直接跳转到 profile
        if (window.isLoggedIn && window.isLoggedIn()) {
            window.location.hash = '/profile';
            return;
        }
        // 聚焦邮箱输入框
        setTimeout(function() {
            var emailInput = document.getElementById('auth-email');
            if (emailInput) emailInput.focus();
        }, 200);
    }

    function switchToRegister() {
        state.mode = 'register';
        state.errorMsg = '';
        window.authPageRender();
    }

    function switchToLogin() {
        state.mode = 'login';
        state.errorMsg = '';
        window.authPageRender();
    }

    async function submit() {
        var email = (document.getElementById('auth-email') || {}).value || '';
        var password = (document.getElementById('auth-password') || {}).value || '';
        var storeName = state.mode === 'register' ? ((document.getElementById('auth-store-name') || {}).value || '') : '';

        // 基本验证
        if (!email) {
            state.errorMsg = '请输入邮箱';
            window.authPageRender();
            return;
        }
        if (!password || password.length < 6) {
            state.errorMsg = '密码至少需要6位';
            window.authPageRender();
            return;
        }
        if (state.mode === 'register' && !storeName) {
            state.errorMsg = '请输入店铺名称';
            window.authPageRender();
            return;
        }

        state.email = email;
        state.password = password;
        state.storeName = storeName;
        state.errorMsg = '';
        state.isLoading = true;
        window.authPageRender();

        try {
            var result;
            if (state.mode === 'register') {
                result = await window.authRegister(email, password, storeName);
            } else {
                result = await window.authLogin(email, password);
            }

            console.log('[auth.js] 认证成功:', result);

            // 登录成功后重置首页数据，确保切回首页时重新加载
            if (window.homeState) {
                window.homeState.allGames = [];
            }

            // 获取店家信息并缓存
            if (window.authGetMe) {
                try {
                    var me = await window.authGetMe();
                    if (me) {
                        window._shopInfo = {
                            id: me.id || me.store_id || '',
                            name: me.store_name || me.name || '我的桌游吧',
                            logo_url: me.logo_url || '',
                            theme_color: me.theme_color || '#C4864B'
                        };
                        console.log('[auth.js] 店家信息:', window._shopInfo.name);
                    }
                } catch (e) {
                    console.warn('[auth.js] 获取店家信息失败:', e);
                }
            }

            // 跳转到管理页
            window.location.hash = '/profile';
        } catch (e) {
            console.error('[auth.js] 认证失败:', e);
            state.errorMsg = e.message || '操作失败，请检查网络后重试';
            state.isLoading = false;
            window.authPageRender();
        }
    }

    // 导出
    var page = { render: render, init: init, switchToRegister: switchToRegister, switchToLogin: switchToLogin, submit: submit };

    window.authPage = page;
    window.authPageRender = function() {
        if (window._activePage !== 'auth') return;
        var app = document.getElementById('app');
        if (app) {
            app.innerHTML = page.render();
            page.init();
        }
    };

    return page;
})());
