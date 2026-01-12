; TG-Matrix NSIS 自定義安裝腳本

!macro customHeader
  ; 自定義標頭
!macroend

!macro preInit
  ; 安裝前初始化
!macroend

!macro customInit
  ; 自定義初始化
!macroend

!macro customInstall
  ; 創建數據目錄
  CreateDirectory "$INSTDIR\data"
  CreateDirectory "$INSTDIR\data\sessions"
  CreateDirectory "$INSTDIR\data\backups"
  CreateDirectory "$INSTDIR\data\logs"
  
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
