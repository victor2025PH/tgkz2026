; TG-AI智控王 NSIS 自定義安裝腳本
; TG-AI SmartKing v2.1.0 Installer Script
; 全功能版 - 包含所有依賴

!macro customHeader
  ; 自定義標頭 - 不重新定義已由 electron-builder 定義的變量
!macroend

!macro preInit
  ; 安裝前初始化
!macroend

!macro customInit
  ; 自定義初始化
!macroend

; 🆕 P0: 檢查並自動安裝 VC++ 運行時
!macro checkAndInstallVCRedist
  ; 檢查 VC++ 2015-2022 x64 運行時
  ReadRegStr $0 HKLM "SOFTWARE\Microsoft\VisualStudio\14.0\VC\Runtimes\x64" "Installed"
  ${If} $0 != "1"
    ; VC++ 未安裝，自動安裝
    DetailPrint "正在安裝 Visual C++ 運行時庫..."
    
    ; 檢查 VC++ 安裝程序是否存在
    IfFileExists "$INSTDIR\resources\vc_redist.x64.exe" 0 vcredist_not_found
      ; 靜默安裝 VC++ 運行時
      ExecWait '"$INSTDIR\resources\vc_redist.x64.exe" /install /quiet /norestart' $1
      ${If} $1 == 0
        DetailPrint "Visual C++ 運行時庫安裝成功"
      ${Else}
        DetailPrint "Visual C++ 運行時庫安裝返回代碼: $1"
      ${EndIf}
      Goto vcredist_done
    
    vcredist_not_found:
      ; 如果安裝程序不存在，提示用戶下載
      MessageBox MB_YESNO|MB_ICONEXCLAMATION "檢測到系統缺少 Visual C++ 運行時庫。$\n$\n這可能導致程序無法正常運行。$\n$\n是否前往 Microsoft 官網下載安裝？" IDNO vcredist_done
        ExecShell "open" "https://aka.ms/vs/17/release/vc_redist.x64.exe"
    
    vcredist_done:
  ${Else}
    DetailPrint "Visual C++ 運行時庫已安裝"
  ${EndIf}
!macroend

!macro customInstall
  ; 🆕 P0: 檢查並安裝 VC++ 運行時
  !insertmacro checkAndInstallVCRedist
  
  ; 創建數據目錄
  CreateDirectory "$INSTDIR\data"
  CreateDirectory "$INSTDIR\data\sessions"
  CreateDirectory "$INSTDIR\data\backups"
  CreateDirectory "$INSTDIR\data\logs"
  
  ; 🆕 創建後端數據目錄
  CreateDirectory "$INSTDIR\resources\backend-exe\sessions"
  CreateDirectory "$INSTDIR\resources\backend-exe\data"
  
  ; 寫入版本信息
  FileOpen $0 "$INSTDIR\version.txt" w
  FileWrite $0 "TG-Matrix v${VERSION}$\r$\n"
  FileWrite $0 "Installed: $\r$\n"
  FileClose $0
!macroend

!macro customUnInstall
  ; 卸載時詢問是否刪除數據
  MessageBox MB_YESNO "是否刪除用戶數據？" IDNO skip_data
    RMDir /r "$INSTDIR\data"
  skip_data:
!macroend
