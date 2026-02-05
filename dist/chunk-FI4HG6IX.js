import {
  ANIMATION_OPTIONS,
  AnimationConfigService,
  BackupService,
  SchedulerService,
  SettingsService
} from "./chunk-CTKGMQYJ.js";
import {
  I18nService,
  SUPPORTED_LOCALES
} from "./chunk-ZTUGHWSQ.js";
import {
  FormsModule,
  NgSelectOption,
  ɵNgSelectMultipleOption
} from "./chunk-AF6KAQ3H.js";
import {
  CommonModule,
  DatePipe
} from "./chunk-BTHEVO76.js";
import {
  MembershipService,
  ToastService
} from "./chunk-P26VRYR4.js";
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  setClassMetadata,
  signal,
  ɵsetClassDebugInfo,
  ɵɵadvance,
  ɵɵattribute,
  ɵɵclassMap,
  ɵɵclassProp,
  ɵɵconditional,
  ɵɵconditionalCreate,
  ɵɵdefineComponent,
  ɵɵdomElement,
  ɵɵdomElementEnd,
  ɵɵdomElementStart,
  ɵɵdomListener,
  ɵɵelement,
  ɵɵelementEnd,
  ɵɵelementStart,
  ɵɵgetCurrentView,
  ɵɵlistener,
  ɵɵnamespaceSVG,
  ɵɵnextContext,
  ɵɵpipe,
  ɵɵpipeBind2,
  ɵɵproperty,
  ɵɵrepeater,
  ɵɵrepeaterCreate,
  ɵɵresetView,
  ɵɵrestoreView,
  ɵɵtext,
  ɵɵtextInterpolate,
  ɵɵtextInterpolate1,
  ɵɵtextInterpolate2
} from "./chunk-K4KD4A2Z.js";

// src/components/animation-selector.component.ts
var _forTrack0 = ($index, $item) => $item.id;
function AnimationSelectorComponent_For_13_Conditional_9_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275domElementStart(0, "div", 23);
    \u0275\u0275namespaceSVG();
    \u0275\u0275domElementStart(1, "svg", 24);
    \u0275\u0275domElement(2, "path", 25);
    \u0275\u0275domElementEnd()();
  }
}
function AnimationSelectorComponent_For_13_Template(rf, ctx) {
  if (rf & 1) {
    const _r1 = \u0275\u0275getCurrentView();
    \u0275\u0275domElementStart(0, "button", 17);
    \u0275\u0275domListener("click", function AnimationSelectorComponent_For_13_Template_button_click_0_listener() {
      const option_r2 = \u0275\u0275restoreView(_r1).$implicit;
      const ctx_r2 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r2.selectAnimation(option_r2.id));
    })("mouseenter", function AnimationSelectorComponent_For_13_Template_button_mouseenter_0_listener() {
      const option_r2 = \u0275\u0275restoreView(_r1).$implicit;
      const ctx_r2 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r2.previewAnimation(option_r2.id));
    })("mouseleave", function AnimationSelectorComponent_For_13_Template_button_mouseleave_0_listener() {
      \u0275\u0275restoreView(_r1);
      const ctx_r2 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r2.stopPreview());
    });
    \u0275\u0275domElementStart(1, "div", 18)(2, "span", 19);
    \u0275\u0275text(3);
    \u0275\u0275domElementEnd()();
    \u0275\u0275domElementStart(4, "div", 20)(5, "span", 21);
    \u0275\u0275text(6);
    \u0275\u0275domElementEnd();
    \u0275\u0275domElementStart(7, "span", 22);
    \u0275\u0275text(8);
    \u0275\u0275domElementEnd()();
    \u0275\u0275conditionalCreate(9, AnimationSelectorComponent_For_13_Conditional_9_Template, 3, 0, "div", 23);
    \u0275\u0275domElementEnd();
  }
  if (rf & 2) {
    const option_r2 = ctx.$implicit;
    const ctx_r2 = \u0275\u0275nextContext();
    \u0275\u0275classProp("active", ctx_r2.currentType() === option_r2.id);
    \u0275\u0275advance();
    \u0275\u0275classProp("animating", ctx_r2.previewingType() === option_r2.id);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(option_r2.preview);
    \u0275\u0275advance(3);
    \u0275\u0275textInterpolate(option_r2.name);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(option_r2.description);
    \u0275\u0275advance();
    \u0275\u0275conditional(ctx_r2.currentType() === option_r2.id ? 9 : -1);
  }
}
var AnimationSelectorComponent = class _AnimationSelectorComponent {
  constructor() {
    this.animationConfig = inject(AnimationConfigService);
    this.toast = inject(ToastService);
    this.options = ANIMATION_OPTIONS;
    this.currentType = this.animationConfig.animationType;
    this.previewingType = signal(null, ...ngDevMode ? [{ debugName: "previewingType" }] : []);
    this.isPlaying = signal(false, ...ngDevMode ? [{ debugName: "isPlaying" }] : []);
  }
  selectAnimation(type) {
    this.animationConfig.setAnimationType(type);
    this.toast.success(`\u5DF2\u5207\u63DB\u70BA\u300C${this.options.find((o) => o.id === type)?.name}\u300D\u52D5\u756B`);
  }
  previewAnimation(type) {
    this.previewingType.set(type);
  }
  stopPreview() {
    this.previewingType.set(null);
  }
  resetToDefault() {
    this.animationConfig.resetToDefault();
    this.toast.info("\u5DF2\u91CD\u7F6E\u70BA\u9ED8\u8A8D\u52D5\u756B");
  }
  triggerPreview() {
    this.isPlaying.set(true);
    setTimeout(() => this.isPlaying.set(false), 700);
  }
  static {
    this.\u0275fac = function AnimationSelectorComponent_Factory(__ngFactoryType__) {
      return new (__ngFactoryType__ || _AnimationSelectorComponent)();
    };
  }
  static {
    this.\u0275cmp = /* @__PURE__ */ \u0275\u0275defineComponent({ type: _AnimationSelectorComponent, selectors: [["app-animation-selector"]], decls: 31, vars: 3, consts: [[1, "animation-selector"], [1, "flex", "items-center", "justify-between", "mb-4"], [1, "flex", "items-center", "gap-2"], [1, "text-xl"], [1, "text-lg", "font-semibold", "text-white"], [1, "text-xs", "px-2", "py-1", "rounded", "bg-slate-700", "hover:bg-slate-600", "text-slate-300", "transition-colors", 3, "click"], [1, "text-sm", "text-slate-400", "mb-4"], [1, "grid", "grid-cols-2", "md:grid-cols-3", "gap-3"], [1, "animation-option", "group", 3, "active"], [1, "mt-6", "p-4", "rounded-lg", "bg-slate-800/50", "border", "border-slate-700"], [1, "flex", "items-center", "justify-between", "mb-3"], [1, "text-sm", "text-slate-400"], [1, "text-xs", "px-3", "py-1", "rounded-full", "bg-cyan-500/20", "text-cyan-400", "hover:bg-cyan-500/30", "transition-colors", 3, "click"], [1, "preview-container"], [1, "preview-page", "from"], [1, "page-icon"], [1, "preview-page", "to"], [1, "animation-option", "group", 3, "click", "mouseenter", "mouseleave"], [1, "preview-icon"], [1, "text-2xl"], [1, "option-info"], [1, "option-name"], [1, "option-desc"], [1, "selected-badge"], ["fill", "currentColor", "viewBox", "0 0 20 20", 1, "w-4", "h-4"], ["fill-rule", "evenodd", "d", "M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z", "clip-rule", "evenodd"]], template: function AnimationSelectorComponent_Template(rf, ctx) {
      if (rf & 1) {
        \u0275\u0275domElementStart(0, "div", 0)(1, "div", 1)(2, "div", 2)(3, "span", 3);
        \u0275\u0275text(4, "\u2728");
        \u0275\u0275domElementEnd();
        \u0275\u0275domElementStart(5, "h3", 4);
        \u0275\u0275text(6, "\u9801\u9762\u5207\u63DB\u52D5\u756B");
        \u0275\u0275domElementEnd()();
        \u0275\u0275domElementStart(7, "button", 5);
        \u0275\u0275domListener("click", function AnimationSelectorComponent_Template_button_click_7_listener() {
          return ctx.resetToDefault();
        });
        \u0275\u0275text(8, " \u91CD\u7F6E\u9ED8\u8A8D ");
        \u0275\u0275domElementEnd()();
        \u0275\u0275domElementStart(9, "p", 6);
        \u0275\u0275text(10, " \u9078\u64C7\u9801\u9762\u5207\u63DB\u6642\u7684\u52D5\u756B\u6548\u679C\uFF0C\u8B93\u60A8\u7684\u64CD\u4F5C\u9AD4\u9A57\u66F4\u52A0\u6D41\u66A2\u3002 ");
        \u0275\u0275domElementEnd();
        \u0275\u0275domElementStart(11, "div", 7);
        \u0275\u0275repeaterCreate(12, AnimationSelectorComponent_For_13_Template, 10, 8, "button", 8, _forTrack0);
        \u0275\u0275domElementEnd();
        \u0275\u0275domElementStart(14, "div", 9)(15, "div", 10)(16, "span", 11);
        \u0275\u0275text(17, "\u7576\u524D\u6548\u679C\u9810\u89BD");
        \u0275\u0275domElementEnd();
        \u0275\u0275domElementStart(18, "button", 12);
        \u0275\u0275domListener("click", function AnimationSelectorComponent_Template_button_click_18_listener() {
          return ctx.triggerPreview();
        });
        \u0275\u0275text(19, " \u64AD\u653E\u9810\u89BD ");
        \u0275\u0275domElementEnd()();
        \u0275\u0275domElementStart(20, "div", 13)(21, "div", 14)(22, "div", 15);
        \u0275\u0275text(23, "\u{1F4CB}");
        \u0275\u0275domElementEnd();
        \u0275\u0275domElementStart(24, "span");
        \u0275\u0275text(25, "\u820A\u9801\u9762");
        \u0275\u0275domElementEnd()();
        \u0275\u0275domElementStart(26, "div", 16)(27, "div", 15);
        \u0275\u0275text(28, "\u{1F4C4}");
        \u0275\u0275domElementEnd();
        \u0275\u0275domElementStart(29, "span");
        \u0275\u0275text(30, "\u65B0\u9801\u9762");
        \u0275\u0275domElementEnd()()()()();
      }
      if (rf & 2) {
        \u0275\u0275advance(12);
        \u0275\u0275repeater(ctx.options);
        \u0275\u0275advance(8);
        \u0275\u0275classProp("animate", ctx.isPlaying());
        \u0275\u0275advance(6);
        \u0275\u0275attribute("data-animation", ctx.currentType());
      }
    }, dependencies: [CommonModule], styles: ["\n\n.animation-selector[_ngcontent-%COMP%] {\n  padding: 1rem;\n}\n.animation-option[_ngcontent-%COMP%] {\n  display: flex;\n  flex-direction: column;\n  align-items: center;\n  padding: 1rem;\n  border-radius: 0.75rem;\n  background: rgba(30, 41, 59, 0.5);\n  border: 2px solid transparent;\n  transition: all 0.2s ease;\n  cursor: pointer;\n  position: relative;\n}\n.animation-option[_ngcontent-%COMP%]:hover {\n  background: rgba(30, 41, 59, 0.8);\n  border-color: rgba(6, 182, 212, 0.3);\n}\n.animation-option.active[_ngcontent-%COMP%] {\n  background: rgba(6, 182, 212, 0.1);\n  border-color: rgb(6, 182, 212);\n}\n.preview-icon[_ngcontent-%COMP%] {\n  width: 48px;\n  height: 48px;\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  margin-bottom: 0.5rem;\n  transition: transform 0.3s ease;\n}\n.preview-icon.animating[_ngcontent-%COMP%] {\n  animation: _ngcontent-%COMP%_bounce 0.5s ease infinite;\n}\n@keyframes _ngcontent-%COMP%_bounce {\n  0%, 100% {\n    transform: translateY(0);\n  }\n  50% {\n    transform: translateY(-5px);\n  }\n}\n.option-info[_ngcontent-%COMP%] {\n  text-align: center;\n}\n.option-name[_ngcontent-%COMP%] {\n  display: block;\n  font-size: 0.875rem;\n  font-weight: 600;\n  color: white;\n  margin-bottom: 0.25rem;\n}\n.option-desc[_ngcontent-%COMP%] {\n  display: block;\n  font-size: 0.75rem;\n  color: rgb(148, 163, 184);\n}\n.selected-badge[_ngcontent-%COMP%] {\n  position: absolute;\n  top: 0.5rem;\n  right: 0.5rem;\n  width: 20px;\n  height: 20px;\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  border-radius: 50%;\n  background: rgb(6, 182, 212);\n  color: white;\n}\n.preview-container[_ngcontent-%COMP%] {\n  position: relative;\n  height: 80px;\n  background: rgba(15, 23, 42, 0.5);\n  border-radius: 0.5rem;\n  overflow: hidden;\n}\n.preview-page[_ngcontent-%COMP%] {\n  position: absolute;\n  inset: 0.5rem;\n  display: flex;\n  flex-direction: column;\n  align-items: center;\n  justify-content: center;\n  background: rgba(30, 41, 59, 0.8);\n  border-radius: 0.375rem;\n  color: white;\n  font-size: 0.75rem;\n}\n.preview-page.from[_ngcontent-%COMP%] {\n  z-index: 1;\n}\n.preview-page.to[_ngcontent-%COMP%] {\n  z-index: 2;\n  opacity: 0;\n}\n.page-icon[_ngcontent-%COMP%] {\n  font-size: 1.25rem;\n  margin-bottom: 0.25rem;\n}\n.preview-container.animate[_ngcontent-%COMP%]   .preview-page.from[_ngcontent-%COMP%] {\n  animation: _ngcontent-%COMP%_page-out 0.6s ease forwards;\n}\n.preview-container.animate[_ngcontent-%COMP%]   .preview-page.to[_ngcontent-%COMP%] {\n  animation: _ngcontent-%COMP%_page-in 0.6s ease forwards;\n}\n@keyframes _ngcontent-%COMP%_page-out {\n  to {\n    opacity: 0;\n    transform: scale(0.95);\n  }\n}\n@keyframes _ngcontent-%COMP%_page-in {\n  from {\n    opacity: 0;\n    transform: scale(1.05);\n  }\n  to {\n    opacity: 1;\n    transform: scale(1);\n  }\n}\n.preview-page.to[data-animation=fade][_ngcontent-%COMP%] {\n  animation-name: _ngcontent-%COMP%_fade-in;\n}\n.preview-page.to[data-animation=slide][_ngcontent-%COMP%] {\n  animation-name: _ngcontent-%COMP%_slide-in;\n}\n.preview-page.to[data-animation=slideUp][_ngcontent-%COMP%] {\n  animation-name: _ngcontent-%COMP%_slide-up-in;\n}\n.preview-page.to[data-animation=scale][_ngcontent-%COMP%] {\n  animation-name: _ngcontent-%COMP%_scale-in;\n}\n@keyframes _ngcontent-%COMP%_fade-in {\n  from {\n    opacity: 0;\n  }\n  to {\n    opacity: 1;\n  }\n}\n@keyframes _ngcontent-%COMP%_slide-in {\n  from {\n    opacity: 0;\n    transform: translateX(100%);\n  }\n  to {\n    opacity: 1;\n    transform: translateX(0);\n  }\n}\n@keyframes _ngcontent-%COMP%_slide-up-in {\n  from {\n    opacity: 0;\n    transform: translateY(100%);\n  }\n  to {\n    opacity: 1;\n    transform: translateY(0);\n  }\n}\n@keyframes _ngcontent-%COMP%_scale-in {\n  from {\n    opacity: 0;\n    transform: scale(0.5);\n  }\n  to {\n    opacity: 1;\n    transform: scale(1);\n  }\n}\n/*# sourceMappingURL=animation-selector.component.css.map */"] });
  }
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(AnimationSelectorComponent, [{
    type: Component,
    args: [{ selector: "app-animation-selector", standalone: true, imports: [CommonModule], template: `
    <div class="animation-selector">
      <!-- \u6A19\u984C -->
      <div class="flex items-center justify-between mb-4">
        <div class="flex items-center gap-2">
          <span class="text-xl">\u2728</span>
          <h3 class="text-lg font-semibold text-white">\u9801\u9762\u5207\u63DB\u52D5\u756B</h3>
        </div>
        <button 
          (click)="resetToDefault()"
          class="text-xs px-2 py-1 rounded bg-slate-700 hover:bg-slate-600 text-slate-300 transition-colors">
          \u91CD\u7F6E\u9ED8\u8A8D
        </button>
      </div>
      
      <p class="text-sm text-slate-400 mb-4">
        \u9078\u64C7\u9801\u9762\u5207\u63DB\u6642\u7684\u52D5\u756B\u6548\u679C\uFF0C\u8B93\u60A8\u7684\u64CD\u4F5C\u9AD4\u9A57\u66F4\u52A0\u6D41\u66A2\u3002
      </p>
      
      <!-- \u52D5\u756B\u9078\u9805\u7DB2\u683C -->
      <div class="grid grid-cols-2 md:grid-cols-3 gap-3">
        @for (option of options; track option.id) {
          <button
            (click)="selectAnimation(option.id)"
            class="animation-option group"
            [class.active]="currentType() === option.id"
            (mouseenter)="previewAnimation(option.id)"
            (mouseleave)="stopPreview()">
            
            <!-- \u9810\u89BD\u5716\u6A19 -->
            <div class="preview-icon" [class.animating]="previewingType() === option.id">
              <span class="text-2xl">{{ option.preview }}</span>
            </div>
            
            <!-- \u9078\u9805\u4FE1\u606F -->
            <div class="option-info">
              <span class="option-name">{{ option.name }}</span>
              <span class="option-desc">{{ option.description }}</span>
            </div>
            
            <!-- \u9078\u4E2D\u6307\u793A\u5668 -->
            @if (currentType() === option.id) {
              <div class="selected-badge">
                <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
                </svg>
              </div>
            }
          </button>
        }
      </div>
      
      <!-- \u7576\u524D\u52D5\u756B\u9810\u89BD -->
      <div class="mt-6 p-4 rounded-lg bg-slate-800/50 border border-slate-700">
        <div class="flex items-center justify-between mb-3">
          <span class="text-sm text-slate-400">\u7576\u524D\u6548\u679C\u9810\u89BD</span>
          <button 
            (click)="triggerPreview()"
            class="text-xs px-3 py-1 rounded-full bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 transition-colors">
            \u64AD\u653E\u9810\u89BD
          </button>
        </div>
        
        <div class="preview-container" [class.animate]="isPlaying()">
          <div class="preview-page from">
            <div class="page-icon">\u{1F4CB}</div>
            <span>\u820A\u9801\u9762</span>
          </div>
          <div class="preview-page to" [attr.data-animation]="currentType()">
            <div class="page-icon">\u{1F4C4}</div>
            <span>\u65B0\u9801\u9762</span>
          </div>
        </div>
      </div>
    </div>
  `, styles: ["/* angular:styles/component:css;e3838aa9748ab29deb5ff2bb52831ec357a381a0ea77cf6e112abb5f7374dd9e;D:/tgkz2026/src/components/animation-selector.component.ts */\n.animation-selector {\n  padding: 1rem;\n}\n.animation-option {\n  display: flex;\n  flex-direction: column;\n  align-items: center;\n  padding: 1rem;\n  border-radius: 0.75rem;\n  background: rgba(30, 41, 59, 0.5);\n  border: 2px solid transparent;\n  transition: all 0.2s ease;\n  cursor: pointer;\n  position: relative;\n}\n.animation-option:hover {\n  background: rgba(30, 41, 59, 0.8);\n  border-color: rgba(6, 182, 212, 0.3);\n}\n.animation-option.active {\n  background: rgba(6, 182, 212, 0.1);\n  border-color: rgb(6, 182, 212);\n}\n.preview-icon {\n  width: 48px;\n  height: 48px;\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  margin-bottom: 0.5rem;\n  transition: transform 0.3s ease;\n}\n.preview-icon.animating {\n  animation: bounce 0.5s ease infinite;\n}\n@keyframes bounce {\n  0%, 100% {\n    transform: translateY(0);\n  }\n  50% {\n    transform: translateY(-5px);\n  }\n}\n.option-info {\n  text-align: center;\n}\n.option-name {\n  display: block;\n  font-size: 0.875rem;\n  font-weight: 600;\n  color: white;\n  margin-bottom: 0.25rem;\n}\n.option-desc {\n  display: block;\n  font-size: 0.75rem;\n  color: rgb(148, 163, 184);\n}\n.selected-badge {\n  position: absolute;\n  top: 0.5rem;\n  right: 0.5rem;\n  width: 20px;\n  height: 20px;\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  border-radius: 50%;\n  background: rgb(6, 182, 212);\n  color: white;\n}\n.preview-container {\n  position: relative;\n  height: 80px;\n  background: rgba(15, 23, 42, 0.5);\n  border-radius: 0.5rem;\n  overflow: hidden;\n}\n.preview-page {\n  position: absolute;\n  inset: 0.5rem;\n  display: flex;\n  flex-direction: column;\n  align-items: center;\n  justify-content: center;\n  background: rgba(30, 41, 59, 0.8);\n  border-radius: 0.375rem;\n  color: white;\n  font-size: 0.75rem;\n}\n.preview-page.from {\n  z-index: 1;\n}\n.preview-page.to {\n  z-index: 2;\n  opacity: 0;\n}\n.page-icon {\n  font-size: 1.25rem;\n  margin-bottom: 0.25rem;\n}\n.preview-container.animate .preview-page.from {\n  animation: page-out 0.6s ease forwards;\n}\n.preview-container.animate .preview-page.to {\n  animation: page-in 0.6s ease forwards;\n}\n@keyframes page-out {\n  to {\n    opacity: 0;\n    transform: scale(0.95);\n  }\n}\n@keyframes page-in {\n  from {\n    opacity: 0;\n    transform: scale(1.05);\n  }\n  to {\n    opacity: 1;\n    transform: scale(1);\n  }\n}\n.preview-page.to[data-animation=fade] {\n  animation-name: fade-in;\n}\n.preview-page.to[data-animation=slide] {\n  animation-name: slide-in;\n}\n.preview-page.to[data-animation=slideUp] {\n  animation-name: slide-up-in;\n}\n.preview-page.to[data-animation=scale] {\n  animation-name: scale-in;\n}\n@keyframes fade-in {\n  from {\n    opacity: 0;\n  }\n  to {\n    opacity: 1;\n  }\n}\n@keyframes slide-in {\n  from {\n    opacity: 0;\n    transform: translateX(100%);\n  }\n  to {\n    opacity: 1;\n    transform: translateX(0);\n  }\n}\n@keyframes slide-up-in {\n  from {\n    opacity: 0;\n    transform: translateY(100%);\n  }\n  to {\n    opacity: 1;\n    transform: translateY(0);\n  }\n}\n@keyframes scale-in {\n  from {\n    opacity: 0;\n    transform: scale(0.5);\n  }\n  to {\n    opacity: 1;\n    transform: scale(1);\n  }\n}\n/*# sourceMappingURL=animation-selector.component.css.map */\n"] }]
  }], null, null);
})();
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && \u0275setClassDebugInfo(AnimationSelectorComponent, { className: "AnimationSelectorComponent", filePath: "src/components/animation-selector.component.ts", lineNumber: 270 });
})();

// src/views/settings-view.component.ts
var _forTrack02 = ($index, $item) => $item.code;
var _forTrack1 = ($index, $item) => $item.id;
var _forTrack2 = ($index, $item) => $item.name;
function SettingsViewComponent_Conditional_12_For_38_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "option", 18);
    \u0275\u0275text(1);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const locale_r3 = ctx.$implicit;
    const ctx_r1 = \u0275\u0275nextContext(2);
    \u0275\u0275property("value", locale_r3.code)("selected", ctx_r1.i18n.locale() === locale_r3.code);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate2(" ", locale_r3.flag, " ", locale_r3.nativeName, " ");
  }
}
function SettingsViewComponent_Conditional_12_Template(rf, ctx) {
  if (rf & 1) {
    const _r1 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 6);
    \u0275\u0275element(1, "app-animation-selector");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(2, "div", 6)(3, "div", 7)(4, "span", 8);
    \u0275\u0275text(5, "\u{1F3A8}");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(6, "h3", 9);
    \u0275\u0275text(7, "\u4E3B\u984C\u8A2D\u7F6E");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(8, "div", 10)(9, "button", 11);
    \u0275\u0275listener("click", function SettingsViewComponent_Conditional_12_Template_button_click_9_listener() {
      \u0275\u0275restoreView(_r1);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.setTheme("dark"));
    });
    \u0275\u0275elementStart(10, "div", 12)(11, "div", 13)(12, "span", 8);
    \u0275\u0275text(13, "\u{1F319}");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(14, "span", 14);
    \u0275\u0275text(15, "\u6DF1\u8272\u4E3B\u984C");
    \u0275\u0275elementEnd()()();
    \u0275\u0275elementStart(16, "button", 11);
    \u0275\u0275listener("click", function SettingsViewComponent_Conditional_12_Template_button_click_16_listener() {
      \u0275\u0275restoreView(_r1);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.setTheme("light"));
    });
    \u0275\u0275elementStart(17, "div", 12)(18, "div", 15)(19, "span", 8);
    \u0275\u0275text(20, "\u2600\uFE0F");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(21, "span", 14);
    \u0275\u0275text(22, "\u6DFA\u8272\u4E3B\u984C");
    \u0275\u0275elementEnd()()();
    \u0275\u0275elementStart(23, "button", 11);
    \u0275\u0275listener("click", function SettingsViewComponent_Conditional_12_Template_button_click_23_listener() {
      \u0275\u0275restoreView(_r1);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.setTheme("system"));
    });
    \u0275\u0275elementStart(24, "div", 12)(25, "div", 16)(26, "span", 8);
    \u0275\u0275text(27, "\u{1F4BB}");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(28, "span", 14);
    \u0275\u0275text(29, "\u8DDF\u96A8\u7CFB\u7D71");
    \u0275\u0275elementEnd()()()()();
    \u0275\u0275elementStart(30, "div", 4)(31, "div", 7)(32, "span", 8);
    \u0275\u0275text(33, "\u{1F310}");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(34, "h3", 9);
    \u0275\u0275text(35, "\u8A9E\u8A00\u8A2D\u7F6E");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(36, "select", 17);
    \u0275\u0275listener("change", function SettingsViewComponent_Conditional_12_Template_select_change_36_listener($event) {
      \u0275\u0275restoreView(_r1);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.onLocaleChange($event));
    });
    \u0275\u0275repeaterCreate(37, SettingsViewComponent_Conditional_12_For_38_Template, 2, 4, "option", 18, _forTrack02);
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const ctx_r1 = \u0275\u0275nextContext();
    \u0275\u0275advance(9);
    \u0275\u0275classProp("border-cyan-500", ctx_r1.settings.settings().theme === "dark")("border-slate-700", ctx_r1.settings.settings().theme !== "dark")("bg-slate-800", true);
    \u0275\u0275advance(7);
    \u0275\u0275classProp("border-cyan-500", ctx_r1.settings.settings().theme === "light")("border-slate-700", ctx_r1.settings.settings().theme !== "light")("bg-slate-800", true);
    \u0275\u0275advance(7);
    \u0275\u0275classProp("border-cyan-500", ctx_r1.settings.settings().theme === "system")("border-slate-700", ctx_r1.settings.settings().theme !== "system")("bg-slate-800", true);
    \u0275\u0275advance(14);
    \u0275\u0275repeater(ctx_r1.supportedLocales);
  }
}
function SettingsViewComponent_Conditional_13_Conditional_9_For_14_Template(rf, ctx) {
  if (rf & 1) {
    const _r5 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "tr", 30)(1, "td", 31);
    \u0275\u0275text(2);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(3, "td", 32);
    \u0275\u0275text(4);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(5, "td", 32);
    \u0275\u0275text(6);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(7, "td", 33)(8, "button", 34);
    \u0275\u0275listener("click", function SettingsViewComponent_Conditional_13_Conditional_9_For_14_Template_button_click_8_listener() {
      const b_r6 = \u0275\u0275restoreView(_r5).$implicit;
      const ctx_r1 = \u0275\u0275nextContext(3);
      return \u0275\u0275resetView(ctx_r1.restoreBackup(b_r6.id));
    });
    \u0275\u0275text(9, " \u6062\u5FA9 ");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(10, "button", 35);
    \u0275\u0275listener("click", function SettingsViewComponent_Conditional_13_Conditional_9_For_14_Template_button_click_10_listener() {
      const b_r6 = \u0275\u0275restoreView(_r5).$implicit;
      const ctx_r1 = \u0275\u0275nextContext(3);
      return \u0275\u0275resetView(ctx_r1.deleteBackup(b_r6.id));
    });
    \u0275\u0275text(11, " \u522A\u9664 ");
    \u0275\u0275elementEnd()()();
  }
  if (rf & 2) {
    const b_r6 = ctx.$implicit;
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(b_r6.name);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(b_r6.created_at);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(b_r6.size || "N/A");
  }
}
function SettingsViewComponent_Conditional_13_Conditional_9_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 24)(1, "table", 26)(2, "thead", 27)(3, "tr")(4, "th", 28);
    \u0275\u0275text(5, "\u5099\u4EFD\u540D\u7A31");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(6, "th", 28);
    \u0275\u0275text(7, "\u5275\u5EFA\u6642\u9593");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(8, "th", 28);
    \u0275\u0275text(9, "\u5927\u5C0F");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(10, "th", 29);
    \u0275\u0275text(11, "\u64CD\u4F5C");
    \u0275\u0275elementEnd()()();
    \u0275\u0275elementStart(12, "tbody");
    \u0275\u0275repeaterCreate(13, SettingsViewComponent_Conditional_13_Conditional_9_For_14_Template, 12, 3, "tr", 30, _forTrack1);
    \u0275\u0275elementEnd()()();
  }
  if (rf & 2) {
    const ctx_r1 = \u0275\u0275nextContext(2);
    \u0275\u0275advance(13);
    \u0275\u0275repeater(ctx_r1.backup.backups());
  }
}
function SettingsViewComponent_Conditional_13_Conditional_10_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "p", 25);
    \u0275\u0275text(1, "\u66AB\u7121\u5099\u4EFD");
    \u0275\u0275elementEnd();
  }
}
function SettingsViewComponent_Conditional_13_Template(rf, ctx) {
  if (rf & 1) {
    const _r4 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 4)(1, "div", 19)(2, "h3", 20);
    \u0275\u0275text(3, " \u{1F4BE} \u5099\u4EFD\u7BA1\u7406 ");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(4, "div", 21)(5, "button", 22);
    \u0275\u0275listener("click", function SettingsViewComponent_Conditional_13_Template_button_click_5_listener() {
      \u0275\u0275restoreView(_r4);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.createBackup());
    });
    \u0275\u0275text(6);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(7, "button", 23);
    \u0275\u0275listener("click", function SettingsViewComponent_Conditional_13_Template_button_click_7_listener() {
      \u0275\u0275restoreView(_r4);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.loadBackups());
    });
    \u0275\u0275text(8, " \u5237\u65B0 ");
    \u0275\u0275elementEnd()()();
    \u0275\u0275conditionalCreate(9, SettingsViewComponent_Conditional_13_Conditional_9_Template, 15, 0, "div", 24)(10, SettingsViewComponent_Conditional_13_Conditional_10_Template, 2, 0, "p", 25);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const ctx_r1 = \u0275\u0275nextContext();
    \u0275\u0275advance(5);
    \u0275\u0275property("disabled", ctx_r1.backup.isCreating());
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1(" ", ctx_r1.backup.isCreating() ? "\u5275\u5EFA\u4E2D..." : "\u5275\u5EFA\u5099\u4EFD", " ");
    \u0275\u0275advance(3);
    \u0275\u0275conditional(ctx_r1.backup.backups().length > 0 ? 9 : 10);
  }
}
function SettingsViewComponent_Conditional_14_Conditional_5_Template(rf, ctx) {
  if (rf & 1) {
    const _r8 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "button", 47);
    \u0275\u0275listener("click", function SettingsViewComponent_Conditional_14_Conditional_5_Template_button_click_0_listener() {
      \u0275\u0275restoreView(_r8);
      const ctx_r1 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r1.stopScheduler());
    });
    \u0275\u0275text(1, " \u23F9\uFE0F \u505C\u6B62 ");
    \u0275\u0275elementEnd();
  }
}
function SettingsViewComponent_Conditional_14_Conditional_6_Template(rf, ctx) {
  if (rf & 1) {
    const _r9 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "button", 48);
    \u0275\u0275listener("click", function SettingsViewComponent_Conditional_14_Conditional_6_Template_button_click_0_listener() {
      \u0275\u0275restoreView(_r9);
      const ctx_r1 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r1.startScheduler());
    });
    \u0275\u0275text(1, " \u25B6\uFE0F \u555F\u52D5 ");
    \u0275\u0275elementEnd();
  }
}
function SettingsViewComponent_Conditional_14_Conditional_30_For_16_Template(rf, ctx) {
  if (rf & 1) {
    const _r10 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "tr", 30)(1, "td", 49);
    \u0275\u0275text(2);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(3, "td", 32);
    \u0275\u0275text(4);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(5, "td", 32);
    \u0275\u0275text(6);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(7, "td", 50)(8, "span", 51);
    \u0275\u0275text(9);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(10, "td", 33)(11, "button", 52);
    \u0275\u0275listener("click", function SettingsViewComponent_Conditional_14_Conditional_30_For_16_Template_button_click_11_listener() {
      const task_r11 = \u0275\u0275restoreView(_r10).$implicit;
      const ctx_r1 = \u0275\u0275nextContext(3);
      return \u0275\u0275resetView(ctx_r1.runTask(task_r11.name));
    });
    \u0275\u0275text(12, " \u57F7\u884C ");
    \u0275\u0275elementEnd()()();
  }
  if (rf & 2) {
    const task_r11 = ctx.$implicit;
    const ctx_r1 = \u0275\u0275nextContext(3);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(task_r11.name);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(ctx_r1.scheduler.formatInterval(task_r11.interval));
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(task_r11.lastRun || "\u5F9E\u672A");
    \u0275\u0275advance(2);
    \u0275\u0275classProp("bg-green-500/20", task_r11.status === "running")("text-green-400", task_r11.status === "running")("bg-slate-500/20", task_r11.status === "idle")("text-slate-400", task_r11.status === "idle")("bg-red-500/20", task_r11.status === "error")("text-red-400", task_r11.status === "error");
    \u0275\u0275advance();
    \u0275\u0275textInterpolate2(" ", ctx_r1.scheduler.getTaskStatusIcon(task_r11.status), " ", task_r11.status, " ");
    \u0275\u0275advance(2);
    \u0275\u0275property("disabled", task_r11.status === "running");
  }
}
function SettingsViewComponent_Conditional_14_Conditional_30_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 24)(1, "table", 26)(2, "thead", 27)(3, "tr")(4, "th", 28);
    \u0275\u0275text(5, "\u4EFB\u52D9\u540D\u7A31");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(6, "th", 28);
    \u0275\u0275text(7, "\u9593\u9694");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(8, "th", 28);
    \u0275\u0275text(9, "\u4E0A\u6B21\u57F7\u884C");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(10, "th", 28);
    \u0275\u0275text(11, "\u72C0\u614B");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(12, "th", 29);
    \u0275\u0275text(13, "\u64CD\u4F5C");
    \u0275\u0275elementEnd()()();
    \u0275\u0275elementStart(14, "tbody");
    \u0275\u0275repeaterCreate(15, SettingsViewComponent_Conditional_14_Conditional_30_For_16_Template, 13, 18, "tr", 30, _forTrack2);
    \u0275\u0275elementEnd()()();
  }
  if (rf & 2) {
    const ctx_r1 = \u0275\u0275nextContext(2);
    \u0275\u0275advance(15);
    \u0275\u0275repeater(ctx_r1.scheduler.tasks());
  }
}
function SettingsViewComponent_Conditional_14_Conditional_31_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "p", 25);
    \u0275\u0275text(1, "\u66AB\u7121\u8ABF\u5EA6\u4EFB\u52D9");
    \u0275\u0275elementEnd();
  }
}
function SettingsViewComponent_Conditional_14_Template(rf, ctx) {
  if (rf & 1) {
    const _r7 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 4)(1, "div", 36)(2, "h3", 20);
    \u0275\u0275text(3, " \u23F0 \u4EFB\u52D9\u8ABF\u5EA6 ");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(4, "div", 21);
    \u0275\u0275conditionalCreate(5, SettingsViewComponent_Conditional_14_Conditional_5_Template, 2, 0, "button", 37)(6, SettingsViewComponent_Conditional_14_Conditional_6_Template, 2, 0, "button", 38);
    \u0275\u0275elementStart(7, "button", 39);
    \u0275\u0275listener("click", function SettingsViewComponent_Conditional_14_Template_button_click_7_listener() {
      \u0275\u0275restoreView(_r7);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.loadSchedulerStatus());
    });
    \u0275\u0275text(8, " \u{1F504} \u5237\u65B0 ");
    \u0275\u0275elementEnd()()();
    \u0275\u0275elementStart(9, "div", 40)(10, "div", 41)(11, "div", 42);
    \u0275\u0275text(12, "\u72C0\u614B");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(13, "div", 43);
    \u0275\u0275text(14);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(15, "div", 41)(16, "div", 42);
    \u0275\u0275text(17, "\u904B\u884C\u6642\u9593");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(18, "div", 44);
    \u0275\u0275text(19);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(20, "div", 41)(21, "div", 42);
    \u0275\u0275text(22, "\u7E3D\u4EFB\u52D9");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(23, "div", 45);
    \u0275\u0275text(24);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(25, "div", 41)(26, "div", 42);
    \u0275\u0275text(27, "\u6D3B\u8E8D\u4EFB\u52D9");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(28, "div", 46);
    \u0275\u0275text(29);
    \u0275\u0275elementEnd()()();
    \u0275\u0275conditionalCreate(30, SettingsViewComponent_Conditional_14_Conditional_30_Template, 17, 0, "div", 24)(31, SettingsViewComponent_Conditional_14_Conditional_31_Template, 2, 0, "p", 25);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const ctx_r1 = \u0275\u0275nextContext();
    \u0275\u0275advance(5);
    \u0275\u0275conditional(ctx_r1.scheduler.isRunning() ? 5 : 6);
    \u0275\u0275advance(8);
    \u0275\u0275classProp("text-green-400", ctx_r1.scheduler.isRunning())("text-slate-400", !ctx_r1.scheduler.isRunning());
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1(" ", ctx_r1.scheduler.isRunning() ? "\u904B\u884C\u4E2D" : "\u5DF2\u505C\u6B62", " ");
    \u0275\u0275advance(5);
    \u0275\u0275textInterpolate(ctx_r1.scheduler.uptimeFormatted());
    \u0275\u0275advance(5);
    \u0275\u0275textInterpolate(ctx_r1.scheduler.status().totalTasks);
    \u0275\u0275advance(5);
    \u0275\u0275textInterpolate(ctx_r1.scheduler.status().activeTasks);
    \u0275\u0275advance();
    \u0275\u0275conditional(ctx_r1.scheduler.tasks().length > 0 ? 30 : 31);
  }
}
function SettingsViewComponent_Conditional_15_Conditional_11_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275text(0);
    \u0275\u0275pipe(1, "date");
  }
  if (rf & 2) {
    const ctx_r1 = \u0275\u0275nextContext(2);
    \u0275\u0275textInterpolate1(" \u6709\u6548\u671F\u81F3: ", \u0275\u0275pipeBind2(1, 1, ctx_r1.membershipService.expiresAt(), "yyyy-MM-dd"), " ");
  }
}
function SettingsViewComponent_Conditional_15_Conditional_12_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275text(0, " \u6C38\u4E45\u6709\u6548 ");
  }
}
function SettingsViewComponent_Conditional_15_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 5)(1, "div", 4)(2, "h3", 53);
    \u0275\u0275text(3, "\u6703\u54E1\u4FE1\u606F");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(4, "div", 54)(5, "div", 55);
    \u0275\u0275text(6);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(7, "div")(8, "p", 56);
    \u0275\u0275text(9);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(10, "p", 57);
    \u0275\u0275conditionalCreate(11, SettingsViewComponent_Conditional_15_Conditional_11_Template, 2, 4)(12, SettingsViewComponent_Conditional_15_Conditional_12_Template, 1, 0);
    \u0275\u0275elementEnd()()()();
    \u0275\u0275elementStart(13, "div", 4)(14, "h3", 53);
    \u0275\u0275text(15, "\u7248\u672C\u4FE1\u606F");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(16, "div", 58)(17, "p")(18, "strong", 59);
    \u0275\u0275text(19, "\u7248\u672C\uFF1A");
    \u0275\u0275elementEnd();
    \u0275\u0275text(20, "2.0.0");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(21, "p")(22, "strong", 59);
    \u0275\u0275text(23, "\u69CB\u5EFA\u65E5\u671F\uFF1A");
    \u0275\u0275elementEnd();
    \u0275\u0275text(24, "2026-01");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(25, "p")(26, "strong", 59);
    \u0275\u0275text(27, "\u6280\u8853\u68E7\uFF1A");
    \u0275\u0275elementEnd();
    \u0275\u0275text(28, "Angular 19 + Electron + Python");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(29, "p")(30, "strong", 59);
    \u0275\u0275text(31, "\u52D5\u756B\u6A21\u5F0F\uFF1A");
    \u0275\u0275elementEnd();
    \u0275\u0275text(32);
    \u0275\u0275elementEnd()()()();
  }
  if (rf & 2) {
    const ctx_r1 = \u0275\u0275nextContext();
    \u0275\u0275advance(6);
    \u0275\u0275textInterpolate1(" ", ctx_r1.getMembershipIcon(), " ");
    \u0275\u0275advance(3);
    \u0275\u0275textInterpolate(ctx_r1.getMembershipName());
    \u0275\u0275advance(2);
    \u0275\u0275conditional(ctx_r1.membershipService.expiresAt() ? 11 : 12);
    \u0275\u0275advance(21);
    \u0275\u0275textInterpolate(ctx_r1.animationConfig.animationType());
  }
}
var SettingsViewComponent = class _SettingsViewComponent {
  constructor() {
    this.i18n = inject(I18nService);
    this.membershipService = inject(MembershipService);
    this.settings = inject(SettingsService);
    this.backup = inject(BackupService);
    this.scheduler = inject(SchedulerService);
    this.animationConfig = inject(AnimationConfigService);
    this.activeTab = signal("appearance", ...ngDevMode ? [{ debugName: "activeTab" }] : []);
    this.supportedLocales = SUPPORTED_LOCALES;
  }
  ngOnInit() {
    this.settings.loadSettings();
  }
  // 翻譯方法
  t(key, params) {
    return this.i18n.t(key, params);
  }
  // 主題設置
  setTheme(theme) {
    this.settings.setTheme(theme);
  }
  // 語言切換
  onLocaleChange(event) {
    const locale = event.target.value;
    this.i18n.setLocale(locale);
    this.settings.setLanguage(locale);
  }
  // 備份操作
  loadBackups() {
    this.backup.loadBackups();
  }
  createBackup() {
    this.backup.createBackup();
  }
  restoreBackup(id) {
    this.backup.restoreBackup(id);
  }
  deleteBackup(id) {
    this.backup.deleteBackup(id);
  }
  // 調度器操作
  loadSchedulerStatus() {
    this.scheduler.loadStatus();
  }
  startScheduler() {
    this.scheduler.start();
  }
  stopScheduler() {
    this.scheduler.stop();
  }
  runTask(taskName) {
    this.scheduler.runTask(taskName);
  }
  // 會員信息
  getMembershipIcon() {
    const tier = this.membershipService.level();
    const icons = {
      "free": "\u{1F193}",
      "silver": "\u{1F948}",
      "gold": "\u{1F947}",
      "diamond": "\u{1F48E}",
      "star": "\u{1F31F}",
      "king": "\u{1F451}"
    };
    return icons[tier] || "\u{1F193}";
  }
  getMembershipName() {
    const tier = this.membershipService.level();
    const names = {
      "free": "\u514D\u8CBB\u9AD4\u9A57\u7248",
      "silver": "\u9280\u724C\u6703\u54E1",
      "gold": "\u9EC3\u91D1\u5927\u5E2B",
      "diamond": "\u947D\u77F3\u7CBE\u82F1",
      "star": "\u81F3\u5C0A\u661F\u8000",
      "king": "\u7D42\u6975\u738B\u8005"
    };
    return names[tier] || "\u514D\u8CBB\u9AD4\u9A57\u7248";
  }
  static {
    this.\u0275fac = function SettingsViewComponent_Factory(__ngFactoryType__) {
      return new (__ngFactoryType__ || _SettingsViewComponent)();
    };
  }
  static {
    this.\u0275cmp = /* @__PURE__ */ \u0275\u0275defineComponent({ type: _SettingsViewComponent, selectors: [["app-settings-view"]], decls: 16, vars: 13, consts: [[1, "max-w-6xl", "mx-auto", "p-6"], [1, "text-4xl", "font-bold", "mb-8", "text-white"], [1, "flex", "gap-2", "mb-6", "bg-slate-800/50", "p-1", "rounded-lg", "w-fit"], [1, "px-4", "py-2", "rounded-lg", "transition-all", "flex", "items-center", "gap-2", "text-sm", 3, "click"], [1, "bg-slate-900/50", "backdrop-blur-sm", "border", "border-slate-700", "p-6", "rounded-xl", "shadow-lg"], [1, "grid", "grid-cols-1", "md:grid-cols-2", "gap-6"], [1, "bg-slate-900/50", "backdrop-blur-sm", "border", "border-slate-700", "p-6", "rounded-xl", "shadow-lg", "mb-6"], [1, "flex", "items-center", "gap-2", "mb-4"], [1, "text-xl"], [1, "text-lg", "font-semibold", "text-white"], [1, "grid", "grid-cols-3", "gap-4"], [1, "p-4", "rounded-xl", "border-2", "transition-all", 3, "click"], [1, "flex", "flex-col", "items-center", "gap-2"], [1, "w-12", "h-12", "rounded-lg", "bg-slate-900", "border", "border-slate-600", "flex", "items-center", "justify-center"], [1, "text-sm", "font-medium", "text-white"], [1, "w-12", "h-12", "rounded-lg", "bg-white", "border", "border-slate-300", "flex", "items-center", "justify-center"], [1, "w-12", "h-12", "rounded-lg", "bg-gradient-to-br", "from-slate-900", "to-white", "border", "border-slate-600", "flex", "items-center", "justify-center"], [1, "w-full", "max-w-xs", "py-3", "px-4", "rounded-lg", "bg-slate-800", "text-white", "border", "border-slate-600", 3, "change"], [3, "value", "selected"], [1, "flex", "items-center", "justify-between", "mb-4"], [1, "text-xl", "font-semibold", "flex", "items-center", "gap-2", "text-white"], [1, "flex", "gap-2"], [1, "px-4", "py-2", "bg-cyan-500", "hover:bg-cyan-600", "text-white", "rounded-lg", "disabled:opacity-50", 3, "click", "disabled"], [1, "px-4", "py-2", "bg-slate-700", "hover:bg-slate-600", "text-white", "rounded-lg", 3, "click"], [1, "border", "border-slate-600", "rounded-lg", "overflow-hidden"], [1, "text-slate-400", "text-center", "py-8"], [1, "w-full", "text-sm"], [1, "bg-slate-800/50"], [1, "text-left", "p-3", "text-slate-300"], [1, "text-right", "p-3", "text-slate-300"], [1, "border-t", "border-slate-600", "hover:bg-slate-800/50"], [1, "p-3", "text-white"], [1, "p-3", "text-slate-400"], [1, "p-3", "text-right"], [1, "text-cyan-400", "hover:text-cyan-300", "text-xs", "px-2", "py-1", 3, "click"], [1, "text-red-400", "hover:text-red-300", "text-xs", "px-2", "py-1", 3, "click"], [1, "flex", "items-center", "justify-between", "mb-6"], [1, "px-4", "py-2", "bg-red-500/20", "hover:bg-red-500/30", "text-red-400", "rounded-lg"], [1, "px-4", "py-2", "bg-green-500/20", "hover:bg-green-500/30", "text-green-400", "rounded-lg"], [1, "px-4", "py-2", "bg-cyan-500/20", "hover:bg-cyan-500/30", "text-cyan-400", "rounded-lg", 3, "click"], [1, "grid", "grid-cols-4", "gap-4", "mb-6"], [1, "bg-slate-800/50", "rounded-xl", "p-4", "border", "border-slate-700"], [1, "text-sm", "text-slate-500"], [1, "text-xl", "font-bold"], [1, "text-xl", "font-bold", "text-cyan-400"], [1, "text-xl", "font-bold", "text-blue-400"], [1, "text-xl", "font-bold", "text-purple-400"], [1, "px-4", "py-2", "bg-red-500/20", "hover:bg-red-500/30", "text-red-400", "rounded-lg", 3, "click"], [1, "px-4", "py-2", "bg-green-500/20", "hover:bg-green-500/30", "text-green-400", "rounded-lg", 3, "click"], [1, "p-3", "font-semibold", "text-white"], [1, "p-3"], [1, "px-2", "py-1", "text-xs", "rounded-full"], [1, "text-cyan-400", "hover:text-cyan-300", "text-xs", "px-2", "py-1", "disabled:opacity-50", 3, "click", "disabled"], [1, "text-xl", "font-bold", "mb-4", "text-white"], [1, "flex", "items-center", "gap-4"], [1, "w-16", "h-16", "rounded-full", "bg-gradient-to-r", "from-cyan-500", "to-purple-500", "flex", "items-center", "justify-center", "text-3xl"], [1, "font-bold", "text-lg", "text-white"], [1, "text-sm", "text-slate-400"], [1, "space-y-2", "text-sm", "text-slate-400"], [1, "text-white"]], template: function SettingsViewComponent_Template(rf, ctx) {
      if (rf & 1) {
        \u0275\u0275elementStart(0, "div", 0)(1, "h2", 1);
        \u0275\u0275text(2);
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(3, "div", 2)(4, "button", 3);
        \u0275\u0275listener("click", function SettingsViewComponent_Template_button_click_4_listener() {
          return ctx.activeTab.set("appearance");
        });
        \u0275\u0275text(5, " \u2728 \u5916\u89C0\u8A2D\u7F6E ");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(6, "button", 3);
        \u0275\u0275listener("click", function SettingsViewComponent_Template_button_click_6_listener() {
          ctx.activeTab.set("backup");
          return ctx.loadBackups();
        });
        \u0275\u0275text(7, " \u{1F4BE} \u5099\u4EFD\u7BA1\u7406 ");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(8, "button", 3);
        \u0275\u0275listener("click", function SettingsViewComponent_Template_button_click_8_listener() {
          ctx.activeTab.set("scheduler");
          return ctx.loadSchedulerStatus();
        });
        \u0275\u0275text(9, " \u23F0 \u4EFB\u52D9\u8ABF\u5EA6 ");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(10, "button", 3);
        \u0275\u0275listener("click", function SettingsViewComponent_Template_button_click_10_listener() {
          return ctx.activeTab.set("about");
        });
        \u0275\u0275text(11, " \u2139\uFE0F \u95DC\u65BC ");
        \u0275\u0275elementEnd()();
        \u0275\u0275conditionalCreate(12, SettingsViewComponent_Conditional_12_Template, 39, 18);
        \u0275\u0275conditionalCreate(13, SettingsViewComponent_Conditional_13_Template, 11, 3, "div", 4);
        \u0275\u0275conditionalCreate(14, SettingsViewComponent_Conditional_14_Template, 32, 10, "div", 4);
        \u0275\u0275conditionalCreate(15, SettingsViewComponent_Conditional_15_Template, 33, 4, "div", 5);
        \u0275\u0275elementEnd();
      }
      if (rf & 2) {
        \u0275\u0275advance(2);
        \u0275\u0275textInterpolate(ctx.t("settingsTitle"));
        \u0275\u0275advance(2);
        \u0275\u0275classMap(ctx.activeTab() === "appearance" ? "bg-slate-700 shadow" : "text-slate-500 hover:text-white");
        \u0275\u0275advance(2);
        \u0275\u0275classMap(ctx.activeTab() === "backup" ? "bg-slate-700 shadow" : "text-slate-500 hover:text-white");
        \u0275\u0275advance(2);
        \u0275\u0275classMap(ctx.activeTab() === "scheduler" ? "bg-slate-700 shadow" : "text-slate-500 hover:text-white");
        \u0275\u0275advance(2);
        \u0275\u0275classMap(ctx.activeTab() === "about" ? "bg-slate-700 shadow" : "text-slate-500 hover:text-white");
        \u0275\u0275advance(2);
        \u0275\u0275conditional(ctx.activeTab() === "appearance" ? 12 : -1);
        \u0275\u0275advance();
        \u0275\u0275conditional(ctx.activeTab() === "backup" ? 13 : -1);
        \u0275\u0275advance();
        \u0275\u0275conditional(ctx.activeTab() === "scheduler" ? 14 : -1);
        \u0275\u0275advance();
        \u0275\u0275conditional(ctx.activeTab() === "about" ? 15 : -1);
      }
    }, dependencies: [CommonModule, FormsModule, NgSelectOption, \u0275NgSelectMultipleOption, AnimationSelectorComponent, DatePipe], encapsulation: 2, changeDetection: 0 });
  }
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(SettingsViewComponent, [{
    type: Component,
    args: [{
      selector: "app-settings-view",
      standalone: true,
      changeDetection: ChangeDetectionStrategy.OnPush,
      imports: [CommonModule, FormsModule, AnimationSelectorComponent],
      template: `
    <div class="max-w-6xl mx-auto p-6">
      <h2 class="text-4xl font-bold mb-8 text-white">{{ t('settingsTitle') }}</h2>
      
      <!-- \u8A2D\u7F6E\u6A19\u7C64 -->
      <div class="flex gap-2 mb-6 bg-slate-800/50 p-1 rounded-lg w-fit">
        <button (click)="activeTab.set('appearance')" 
                [class]="activeTab() === 'appearance' ? 'bg-slate-700 shadow' : 'text-slate-500 hover:text-white'"
                class="px-4 py-2 rounded-lg transition-all flex items-center gap-2 text-sm">
          \u2728 \u5916\u89C0\u8A2D\u7F6E
        </button>
        <button (click)="activeTab.set('backup'); loadBackups()" 
                [class]="activeTab() === 'backup' ? 'bg-slate-700 shadow' : 'text-slate-500 hover:text-white'"
                class="px-4 py-2 rounded-lg transition-all flex items-center gap-2 text-sm">
          \u{1F4BE} \u5099\u4EFD\u7BA1\u7406
        </button>
        <button (click)="activeTab.set('scheduler'); loadSchedulerStatus()" 
                [class]="activeTab() === 'scheduler' ? 'bg-slate-700 shadow' : 'text-slate-500 hover:text-white'"
                class="px-4 py-2 rounded-lg transition-all flex items-center gap-2 text-sm">
          \u23F0 \u4EFB\u52D9\u8ABF\u5EA6
        </button>
        <button (click)="activeTab.set('about')" 
                [class]="activeTab() === 'about' ? 'bg-slate-700 shadow' : 'text-slate-500 hover:text-white'"
                class="px-4 py-2 rounded-lg transition-all flex items-center gap-2 text-sm">
          \u2139\uFE0F \u95DC\u65BC
        </button>
      </div>
      
      <!-- \u5916\u89C0\u8A2D\u7F6E\u6A19\u7C64 -->
      @if (activeTab() === 'appearance') {
        <!-- \u52D5\u756B\u9078\u64C7\u5668 -->
        <div class="bg-slate-900/50 backdrop-blur-sm border border-slate-700 p-6 rounded-xl shadow-lg mb-6">
          <app-animation-selector></app-animation-selector>
        </div>
        
        <!-- \u4E3B\u984C\u8A2D\u7F6E -->
        <div class="bg-slate-900/50 backdrop-blur-sm border border-slate-700 p-6 rounded-xl shadow-lg mb-6">
          <div class="flex items-center gap-2 mb-4">
            <span class="text-xl">\u{1F3A8}</span>
            <h3 class="text-lg font-semibold text-white">\u4E3B\u984C\u8A2D\u7F6E</h3>
          </div>
          
          <div class="grid grid-cols-3 gap-4">
            <button (click)="setTheme('dark')"
                    class="p-4 rounded-xl border-2 transition-all"
                    [class.border-cyan-500]="settings.settings().theme === 'dark'"
                    [class.border-slate-700]="settings.settings().theme !== 'dark'"
                    [class.bg-slate-800]="true">
              <div class="flex flex-col items-center gap-2">
                <div class="w-12 h-12 rounded-lg bg-slate-900 border border-slate-600 flex items-center justify-center">
                  <span class="text-xl">\u{1F319}</span>
                </div>
                <span class="text-sm font-medium text-white">\u6DF1\u8272\u4E3B\u984C</span>
              </div>
            </button>
            
            <button (click)="setTheme('light')"
                    class="p-4 rounded-xl border-2 transition-all"
                    [class.border-cyan-500]="settings.settings().theme === 'light'"
                    [class.border-slate-700]="settings.settings().theme !== 'light'"
                    [class.bg-slate-800]="true">
              <div class="flex flex-col items-center gap-2">
                <div class="w-12 h-12 rounded-lg bg-white border border-slate-300 flex items-center justify-center">
                  <span class="text-xl">\u2600\uFE0F</span>
                </div>
                <span class="text-sm font-medium text-white">\u6DFA\u8272\u4E3B\u984C</span>
              </div>
            </button>
            
            <button (click)="setTheme('system')"
                    class="p-4 rounded-xl border-2 transition-all"
                    [class.border-cyan-500]="settings.settings().theme === 'system'"
                    [class.border-slate-700]="settings.settings().theme !== 'system'"
                    [class.bg-slate-800]="true">
              <div class="flex flex-col items-center gap-2">
                <div class="w-12 h-12 rounded-lg bg-gradient-to-br from-slate-900 to-white border border-slate-600 flex items-center justify-center">
                  <span class="text-xl">\u{1F4BB}</span>
                </div>
                <span class="text-sm font-medium text-white">\u8DDF\u96A8\u7CFB\u7D71</span>
              </div>
            </button>
          </div>
        </div>
        
        <!-- \u8A9E\u8A00\u8A2D\u7F6E -->
        <div class="bg-slate-900/50 backdrop-blur-sm border border-slate-700 p-6 rounded-xl shadow-lg">
          <div class="flex items-center gap-2 mb-4">
            <span class="text-xl">\u{1F310}</span>
            <h3 class="text-lg font-semibold text-white">\u8A9E\u8A00\u8A2D\u7F6E</h3>
          </div>
          
          <select (change)="onLocaleChange($event)"
                  class="w-full max-w-xs py-3 px-4 rounded-lg bg-slate-800 text-white border border-slate-600">
            @for (locale of supportedLocales; track locale.code) {
              <option [value]="locale.code" [selected]="i18n.locale() === locale.code">
                {{ locale.flag }} {{ locale.nativeName }}
              </option>
            }
          </select>
        </div>
      }
      
      <!-- \u5099\u4EFD\u7BA1\u7406\u6A19\u7C64 -->
      @if (activeTab() === 'backup') {
        <div class="bg-slate-900/50 backdrop-blur-sm border border-slate-700 p-6 rounded-xl shadow-lg">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-xl font-semibold flex items-center gap-2 text-white">
              \u{1F4BE} \u5099\u4EFD\u7BA1\u7406
            </h3>
            <div class="flex gap-2">
              <button (click)="createBackup()" 
                      [disabled]="backup.isCreating()"
                      class="px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg disabled:opacity-50">
                {{ backup.isCreating() ? '\u5275\u5EFA\u4E2D...' : '\u5275\u5EFA\u5099\u4EFD' }}
              </button>
              <button (click)="loadBackups()" 
                      class="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg">
                \u5237\u65B0
              </button>
            </div>
          </div>
          
          @if (backup.backups().length > 0) {
            <div class="border border-slate-600 rounded-lg overflow-hidden">
              <table class="w-full text-sm">
                <thead class="bg-slate-800/50">
                  <tr>
                    <th class="text-left p-3 text-slate-300">\u5099\u4EFD\u540D\u7A31</th>
                    <th class="text-left p-3 text-slate-300">\u5275\u5EFA\u6642\u9593</th>
                    <th class="text-left p-3 text-slate-300">\u5927\u5C0F</th>
                    <th class="text-right p-3 text-slate-300">\u64CD\u4F5C</th>
                  </tr>
                </thead>
                <tbody>
                  @for (b of backup.backups(); track b.id) {
                    <tr class="border-t border-slate-600 hover:bg-slate-800/50">
                      <td class="p-3 text-white">{{ b.name }}</td>
                      <td class="p-3 text-slate-400">{{ b.created_at }}</td>
                      <td class="p-3 text-slate-400">{{ b.size || 'N/A' }}</td>
                      <td class="p-3 text-right">
                        <button (click)="restoreBackup(b.id)" 
                                class="text-cyan-400 hover:text-cyan-300 text-xs px-2 py-1">
                          \u6062\u5FA9
                        </button>
                        <button (click)="deleteBackup(b.id)" 
                                class="text-red-400 hover:text-red-300 text-xs px-2 py-1">
                          \u522A\u9664
                        </button>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          } @else {
            <p class="text-slate-400 text-center py-8">\u66AB\u7121\u5099\u4EFD</p>
          }
        </div>
      }
      
      <!-- \u4EFB\u52D9\u8ABF\u5EA6\u6A19\u7C64 -->
      @if (activeTab() === 'scheduler') {
        <div class="bg-slate-900/50 backdrop-blur-sm border border-slate-700 p-6 rounded-xl shadow-lg">
          <div class="flex items-center justify-between mb-6">
            <h3 class="text-xl font-semibold flex items-center gap-2 text-white">
              \u23F0 \u4EFB\u52D9\u8ABF\u5EA6
            </h3>
            <div class="flex gap-2">
              @if (scheduler.isRunning()) {
                <button (click)="stopScheduler()" 
                        class="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg">
                  \u23F9\uFE0F \u505C\u6B62
                </button>
              } @else {
                <button (click)="startScheduler()" 
                        class="px-4 py-2 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-lg">
                  \u25B6\uFE0F \u555F\u52D5
                </button>
              }
              <button (click)="loadSchedulerStatus()" 
                      class="px-4 py-2 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 rounded-lg">
                \u{1F504} \u5237\u65B0
              </button>
            </div>
          </div>
          
          <!-- \u72C0\u614B\u6982\u89BD -->
          <div class="grid grid-cols-4 gap-4 mb-6">
            <div class="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
              <div class="text-sm text-slate-500">\u72C0\u614B</div>
              <div class="text-xl font-bold" 
                   [class.text-green-400]="scheduler.isRunning()"
                   [class.text-slate-400]="!scheduler.isRunning()">
                {{ scheduler.isRunning() ? '\u904B\u884C\u4E2D' : '\u5DF2\u505C\u6B62' }}
              </div>
            </div>
            <div class="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
              <div class="text-sm text-slate-500">\u904B\u884C\u6642\u9593</div>
              <div class="text-xl font-bold text-cyan-400">{{ scheduler.uptimeFormatted() }}</div>
            </div>
            <div class="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
              <div class="text-sm text-slate-500">\u7E3D\u4EFB\u52D9</div>
              <div class="text-xl font-bold text-blue-400">{{ scheduler.status().totalTasks }}</div>
            </div>
            <div class="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
              <div class="text-sm text-slate-500">\u6D3B\u8E8D\u4EFB\u52D9</div>
              <div class="text-xl font-bold text-purple-400">{{ scheduler.status().activeTasks }}</div>
            </div>
          </div>
          
          <!-- \u4EFB\u52D9\u5217\u8868 -->
          @if (scheduler.tasks().length > 0) {
            <div class="border border-slate-600 rounded-lg overflow-hidden">
              <table class="w-full text-sm">
                <thead class="bg-slate-800/50">
                  <tr>
                    <th class="text-left p-3 text-slate-300">\u4EFB\u52D9\u540D\u7A31</th>
                    <th class="text-left p-3 text-slate-300">\u9593\u9694</th>
                    <th class="text-left p-3 text-slate-300">\u4E0A\u6B21\u57F7\u884C</th>
                    <th class="text-left p-3 text-slate-300">\u72C0\u614B</th>
                    <th class="text-right p-3 text-slate-300">\u64CD\u4F5C</th>
                  </tr>
                </thead>
                <tbody>
                  @for (task of scheduler.tasks(); track task.name) {
                    <tr class="border-t border-slate-600 hover:bg-slate-800/50">
                      <td class="p-3 font-semibold text-white">{{ task.name }}</td>
                      <td class="p-3 text-slate-400">{{ scheduler.formatInterval(task.interval) }}</td>
                      <td class="p-3 text-slate-400">{{ task.lastRun || '\u5F9E\u672A' }}</td>
                      <td class="p-3">
                        <span class="px-2 py-1 text-xs rounded-full"
                              [class.bg-green-500/20]="task.status === 'running'"
                              [class.text-green-400]="task.status === 'running'"
                              [class.bg-slate-500/20]="task.status === 'idle'"
                              [class.text-slate-400]="task.status === 'idle'"
                              [class.bg-red-500/20]="task.status === 'error'"
                              [class.text-red-400]="task.status === 'error'">
                          {{ scheduler.getTaskStatusIcon(task.status) }} {{ task.status }}
                        </span>
                      </td>
                      <td class="p-3 text-right">
                        <button (click)="runTask(task.name)" 
                                [disabled]="task.status === 'running'"
                                class="text-cyan-400 hover:text-cyan-300 text-xs px-2 py-1 disabled:opacity-50">
                          \u57F7\u884C
                        </button>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          } @else {
            <p class="text-slate-400 text-center py-8">\u66AB\u7121\u8ABF\u5EA6\u4EFB\u52D9</p>
          }
        </div>
      }
      
      <!-- \u95DC\u65BC\u6A19\u7C64 -->
      @if (activeTab() === 'about') {
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <!-- \u6703\u54E1\u4FE1\u606F -->
          <div class="bg-slate-900/50 backdrop-blur-sm border border-slate-700 p-6 rounded-xl shadow-lg">
            <h3 class="text-xl font-bold mb-4 text-white">\u6703\u54E1\u4FE1\u606F</h3>
            <div class="flex items-center gap-4">
              <div class="w-16 h-16 rounded-full bg-gradient-to-r from-cyan-500 to-purple-500 flex items-center justify-center text-3xl">
                {{ getMembershipIcon() }}
              </div>
              <div>
                <p class="font-bold text-lg text-white">{{ getMembershipName() }}</p>
                <p class="text-sm text-slate-400">
                  @if (membershipService.expiresAt()) {
                    \u6709\u6548\u671F\u81F3: {{ membershipService.expiresAt() | date:'yyyy-MM-dd' }}
                  } @else {
                    \u6C38\u4E45\u6709\u6548
                  }
                </p>
              </div>
            </div>
          </div>
          
          <!-- \u7248\u672C\u4FE1\u606F -->
          <div class="bg-slate-900/50 backdrop-blur-sm border border-slate-700 p-6 rounded-xl shadow-lg">
            <h3 class="text-xl font-bold mb-4 text-white">\u7248\u672C\u4FE1\u606F</h3>
            <div class="space-y-2 text-sm text-slate-400">
              <p><strong class="text-white">\u7248\u672C\uFF1A</strong>2.0.0</p>
              <p><strong class="text-white">\u69CB\u5EFA\u65E5\u671F\uFF1A</strong>2026-01</p>
              <p><strong class="text-white">\u6280\u8853\u68E7\uFF1A</strong>Angular 19 + Electron + Python</p>
              <p><strong class="text-white">\u52D5\u756B\u6A21\u5F0F\uFF1A</strong>{{ animationConfig.animationType() }}</p>
            </div>
          </div>
        </div>
      }
    </div>
  `
    }]
  }], null, null);
})();
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && \u0275setClassDebugInfo(SettingsViewComponent, { className: "SettingsViewComponent", filePath: "src/views/settings-view.component.ts", lineNumber: 321 });
})();

export {
  SettingsViewComponent
};
//# sourceMappingURL=chunk-FI4HG6IX.js.map
