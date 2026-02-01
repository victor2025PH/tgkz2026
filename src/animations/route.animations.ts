/**
 * TG-AI智控王 路由動畫
 * Route Animations - 視圖切換動畫效果
 * 
 * 🆕 Phase 23: 添加路由切換動畫
 */

import {
  trigger,
  transition,
  style,
  query,
  animate,
  group,
  animateChild
} from '@angular/animations';

/**
 * 淡入淡出動畫
 * 簡單的透明度切換效果
 */
export const fadeAnimation = trigger('routeAnimations', [
  transition('* <=> *', [
    // 設置進入和離開的元素
    query(':enter, :leave', [
      style({
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        opacity: 0
      })
    ], { optional: true }),
    
    // 離開的元素淡出
    query(':leave', [
      animate('200ms ease-out', style({ opacity: 0 }))
    ], { optional: true }),
    
    // 進入的元素淡入
    query(':enter', [
      animate('300ms ease-in', style({ opacity: 1 }))
    ], { optional: true })
  ])
]);

/**
 * 滑動動畫
 * 從右側滑入，向左側滑出
 */
export const slideAnimation = trigger('routeAnimations', [
  transition('* => *', [
    query(':enter, :leave', [
      style({
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%'
      })
    ], { optional: true }),
    
    group([
      query(':leave', [
        animate('300ms ease-out', style({
          transform: 'translateX(-100%)',
          opacity: 0
        }))
      ], { optional: true }),
      
      query(':enter', [
        style({
          transform: 'translateX(100%)',
          opacity: 0
        }),
        animate('300ms ease-out', style({
          transform: 'translateX(0)',
          opacity: 1
        }))
      ], { optional: true })
    ])
  ])
]);

/**
 * 縮放淡入動畫
 * 進入時放大淡入，離開時縮小淡出
 */
export const scaleAnimation = trigger('routeAnimations', [
  transition('* <=> *', [
    query(':enter, :leave', [
      style({
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%'
      })
    ], { optional: true }),
    
    query(':leave', [
      animate('200ms ease-out', style({
        transform: 'scale(0.95)',
        opacity: 0
      }))
    ], { optional: true }),
    
    query(':enter', [
      style({
        transform: 'scale(1.05)',
        opacity: 0
      }),
      animate('300ms ease-out', style({
        transform: 'scale(1)',
        opacity: 1
      }))
    ], { optional: true })
  ])
]);

/**
 * 向上滑入動畫
 * 新頁面從下方滑入
 */
export const slideUpAnimation = trigger('routeAnimations', [
  transition('* <=> *', [
    query(':enter, :leave', [
      style({
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%'
      })
    ], { optional: true }),
    
    query(':leave', [
      animate('200ms ease-out', style({
        transform: 'translateY(-20px)',
        opacity: 0
      }))
    ], { optional: true }),
    
    query(':enter', [
      style({
        transform: 'translateY(20px)',
        opacity: 0
      }),
      animate('300ms ease-out', style({
        transform: 'translateY(0)',
        opacity: 1
      }))
    ], { optional: true })
  ])
]);

/**
 * 默認動畫（推薦）
 * 結合淡入和微縮放效果，流暢自然
 */
export const defaultRouteAnimation = trigger('routeAnimations', [
  transition('* <=> *', [
    // 設置容器樣式
    style({ position: 'relative' }),
    
    query(':enter, :leave', [
      style({
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%'
      })
    ], { optional: true }),
    
    // 同時執行進入和離開動畫
    group([
      query(':leave', [
        style({ opacity: 1, transform: 'scale(1)' }),
        animate('200ms ease-out', style({
          opacity: 0,
          transform: 'scale(0.98)'
        }))
      ], { optional: true }),
      
      query(':enter', [
        style({ opacity: 0, transform: 'scale(1.02)' }),
        animate('300ms 100ms ease-out', style({
          opacity: 1,
          transform: 'scale(1)'
        }))
      ], { optional: true })
    ]),
    
    // 確保子動畫也執行
    query(':enter', animateChild(), { optional: true })
  ])
]);

/**
 * 無動畫（用於禁用動畫）
 */
export const noAnimation = trigger('routeAnimations', []);
