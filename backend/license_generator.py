"""
TG-Matrix License Key Generator
卡密生成和管理工具（王者榮耀風格等級）

卡密格式: TGM-[類型]-[XXXX]-[XXXX]-[XXXX]
類型代碼:
  B1/B2/B3/BY = 白銀精英 周/月/季/年卡
  G1/G2/G3/GY = 黃金大師 周/月/季/年卡
  D1/D2/D3/DY = 鑽石王牌 周/月/季/年卡
  S1/S2/S3/SY = 星耀傳說 周/月/季/年卡
  K1/K2/K3/KY = 榮耀王者 周/月/季/年卡

等級說明:
  ⚔️ 青銅戰士 (Bronze) - 免費體驗
  🥈 白銀精英 (Silver) - 個人入門
  🥇 黃金大師 (Gold) - 個人進階
  💎 鑽石王牌 (Diamond) - 專業用戶
  🌟 星耀傳說 (Star) - 團隊用戶
  👑 榮耀王者 (King) - 無限尊享
"""

import secrets
import string
import json
import csv
from datetime import datetime
from pathlib import Path
from typing import List, Dict, Optional, Tuple, Any


class LicenseGenerator:
    """卡密生成器（王者榮耀風格）"""
    
    # 等級配置
    LEVELS = {
        'B': {'name': '白銀精英', 'level': 'silver', 'icon': '🥈'},
        'G': {'name': '黃金大師', 'level': 'gold', 'icon': '🥇'},
        'D': {'name': '鑽石王牌', 'level': 'diamond', 'icon': '💎'},
        'S': {'name': '星耀傳說', 'level': 'star', 'icon': '🌟'},
        'K': {'name': '榮耀王者', 'level': 'king', 'icon': '👑'},
    }
    
    # 時長配置
    DURATIONS = {
        '1': {'name': '周卡', 'days': 7},
        '2': {'name': '月卡', 'days': 30},
        '3': {'name': '季卡', 'days': 90},
        'Y': {'name': '年卡', 'days': 365},
    }
    
    # 價格表（月卡價格為基準）
    PRICES = {
        'silver': {'1': 19, '2': 49, '3': 129, 'Y': 399},
        'gold': {'1': 39, '2': 99, '3': 249, 'Y': 799},
        'diamond': {'1': 79, '2': 199, '3': 499, 'Y': 1599},
        'star': {'1': 149, '2': 399, '3': 999, 'Y': 2999},
        'king': {'1': 399, '2': 999, '3': 2499, 'Y': 6999},
    }
    
    # 卡密類型配置（向後兼容 + 新格式）
    LICENSE_TYPES = {
        # 白銀
        'B1': {'name': '白銀周卡', 'level': 'silver', 'days': 7, 'price': 19},
        'B2': {'name': '白銀月卡', 'level': 'silver', 'days': 30, 'price': 49},
        'B3': {'name': '白銀季卡', 'level': 'silver', 'days': 90, 'price': 129},
        'BY': {'name': '白銀年卡', 'level': 'silver', 'days': 365, 'price': 399},
        # 黃金
        'G1': {'name': '黃金周卡', 'level': 'gold', 'days': 7, 'price': 39},
        'G2': {'name': '黃金月卡', 'level': 'gold', 'days': 30, 'price': 99},
        'G3': {'name': '黃金季卡', 'level': 'gold', 'days': 90, 'price': 249},
        'GY': {'name': '黃金年卡', 'level': 'gold', 'days': 365, 'price': 799},
        # 鑽石
        'D1': {'name': '鑽石周卡', 'level': 'diamond', 'days': 7, 'price': 79},
        'D2': {'name': '鑽石月卡', 'level': 'diamond', 'days': 30, 'price': 199},
        'D3': {'name': '鑽石季卡', 'level': 'diamond', 'days': 90, 'price': 499},
        'DY': {'name': '鑽石年卡', 'level': 'diamond', 'days': 365, 'price': 1599},
        # 星耀
        'S1': {'name': '星耀周卡', 'level': 'star', 'days': 7, 'price': 149},
        'S2': {'name': '星耀月卡', 'level': 'star', 'days': 30, 'price': 399},
        'S3': {'name': '星耀季卡', 'level': 'star', 'days': 90, 'price': 999},
        'SY': {'name': '星耀年卡', 'level': 'star', 'days': 365, 'price': 2999},
        # 王者
        'K1': {'name': '王者周卡', 'level': 'king', 'days': 7, 'price': 399},
        'K2': {'name': '王者月卡', 'level': 'king', 'days': 30, 'price': 999},
        'K3': {'name': '王者季卡', 'level': 'king', 'days': 90, 'price': 2499},
        'KY': {'name': '王者年卡', 'level': 'king', 'days': 365, 'price': 6999},
    }
    
    def __init__(self, storage_path: Optional[Path] = None):
        self.storage_path = storage_path or Path(__file__).parent / "data" / "licenses.json"
        self.storage_path.parent.mkdir(parents=True, exist_ok=True)
        self._licenses: Dict[str, Dict] = {}
        self._load()
    
    def _load(self) -> None:
        """加載已生成的卡密"""
        try:
            if self.storage_path.exists():
                with open(self.storage_path, 'r', encoding='utf-8') as f:
                    self._licenses = json.load(f)
        except Exception as e:
            print(f"[LicenseGenerator] Error loading: {e}")
            self._licenses = {}
    
    def _save(self) -> None:
        """保存卡密數據"""
        try:
            with open(self.storage_path, 'w', encoding='utf-8') as f:
                json.dump(self._licenses, f, ensure_ascii=False, indent=2)
        except Exception as e:
            print(f"[LicenseGenerator] Error saving: {e}")
    
    def _generate_segment(self, length: int = 4) -> str:
        """生成卡密段"""
        chars = string.ascii_uppercase + string.digits
        return ''.join(secrets.choice(chars) for _ in range(length))
    
    def generate(self, 
                 type_code: str, 
                 count: int = 1, 
                 batch_name: str = "",
                 notes: str = "") -> List[str]:
        """
        生成卡密
        
        Args:
            type_code: 卡密類型代碼 (W/M/Q/Y/V/S/P)
            count: 生成數量
            batch_name: 批次名稱
            notes: 備註
        
        Returns:
            生成的卡密列表
        """
        type_code = type_code.upper()
        
        if type_code not in self.LICENSE_TYPES:
            raise ValueError(f"Invalid type code: {type_code}")
        
        type_info = self.LICENSE_TYPES[type_code]
        generated = []
        batch_id = datetime.now().strftime('%Y%m%d%H%M%S')
        
        for i in range(count):
            # 生成卡密，確保唯一性
            while True:
                key = f"TGM-{type_code}-{self._generate_segment()}-{self._generate_segment()}-{self._generate_segment()}"
                if key not in self._licenses:
                    break
            
            # 記錄卡密信息
            self._licenses[key] = {
                'type_code': type_code,
                'type_name': type_info['name'],
                'level': type_info['level'],
                'days': type_info['days'],
                'price': type_info['price'],
                'status': 'unused',  # unused, used, expired, disabled
                'created_at': datetime.now().isoformat(),
                'used_at': None,
                'used_by': None,  # machine_id
                'expires_at': None,
                'batch_id': batch_id,
                'batch_name': batch_name or f"Batch-{batch_id}",
                'notes': notes,
            }
            
            generated.append(key)
        
        self._save()
        
        print(f"✅ 生成了 {len(generated)} 個 {type_info['name']} 卡密")
        return generated
    
    def validate(self, key: str) -> Tuple[bool, str, Optional[Dict]]:
        """
        驗證卡密
        
        Returns:
            (valid, message, license_info)
        """
        key = key.upper()
        
        if key not in self._licenses:
            return False, "卡密不存在", None
        
        license_info = self._licenses[key]
        
        if license_info['status'] == 'used':
            return False, "卡密已被使用", license_info
        
        if license_info['status'] == 'disabled':
            return False, "卡密已被禁用", license_info
        
        if license_info['status'] == 'expired':
            return False, "卡密已過期", license_info
        
        return True, "卡密有效", license_info
    
    def use(self, key: str, machine_id: str = "") -> Tuple[bool, str, Optional[Dict]]:
        """
        使用卡密
        
        Returns:
            (success, message, license_info)
        """
        valid, message, license_info = self.validate(key)
        
        if not valid:
            return False, message, license_info
        
        # 標記為已使用
        key = key.upper()
        now = datetime.now()
        days = license_info['days']
        expires_at = now.replace(hour=23, minute=59, second=59)
        expires_at = expires_at.replace(day=expires_at.day + days)
        
        self._licenses[key].update({
            'status': 'used',
            'used_at': now.isoformat(),
            'used_by': machine_id,
            'expires_at': expires_at.isoformat(),
        })
        
        self._save()
        
        return True, f"卡密激活成功，有效期至 {expires_at.strftime('%Y-%m-%d')}", self._licenses[key]
    
    def disable(self, key: str, reason: str = "") -> bool:
        """禁用卡密"""
        key = key.upper()
        if key not in self._licenses:
            return False
        
        self._licenses[key]['status'] = 'disabled'
        self._licenses[key]['disabled_at'] = datetime.now().isoformat()
        self._licenses[key]['disable_reason'] = reason
        
        self._save()
        return True
    
    def get_stats(self) -> Dict[str, Any]:
        """獲取統計信息"""
        stats = {
            'total': len(self._licenses),
            'unused': 0,
            'used': 0,
            'disabled': 0,
            'by_type': {},
            'revenue': 0,
        }
        
        for key, info in self._licenses.items():
            status = info['status']
            type_code = info['type_code']
            
            if status == 'unused':
                stats['unused'] += 1
            elif status == 'used':
                stats['used'] += 1
                stats['revenue'] += info.get('price', 0)
            elif status == 'disabled':
                stats['disabled'] += 1
            
            if type_code not in stats['by_type']:
                stats['by_type'][type_code] = {'total': 0, 'unused': 0, 'used': 0}
            
            stats['by_type'][type_code]['total'] += 1
            if status == 'unused':
                stats['by_type'][type_code]['unused'] += 1
            elif status == 'used':
                stats['by_type'][type_code]['used'] += 1
        
        return stats
    
    def export_to_csv(self, output_path: Path, status_filter: str = None) -> int:
        """導出卡密到CSV"""
        licenses = self._licenses
        
        if status_filter:
            licenses = {k: v for k, v in licenses.items() if v['status'] == status_filter}
        
        with open(output_path, 'w', newline='', encoding='utf-8-sig') as f:
            writer = csv.writer(f)
            writer.writerow(['卡密', '類型', '等級', '天數', '價格', '狀態', '創建時間', '使用時間', '備註'])
            
            for key, info in licenses.items():
                writer.writerow([
                    key,
                    info['type_name'],
                    info['level'],
                    info['days'],
                    info['price'],
                    info['status'],
                    info['created_at'][:19],
                    info.get('used_at', '')[:19] if info.get('used_at') else '',
                    info.get('notes', ''),
                ])
        
        return len(licenses)
    
    def list_unused(self, type_code: str = None) -> List[str]:
        """列出未使用的卡密"""
        unused = []
        for key, info in self._licenses.items():
            if info['status'] == 'unused':
                if type_code is None or info['type_code'] == type_code.upper():
                    unused.append(key)
        return unused


# ============ 命令行工具 ============

def main():
    """命令行入口"""
    import argparse
    
    parser = argparse.ArgumentParser(description='TG-Matrix 卡密生成工具（王者榮耀風格）')
    subparsers = parser.add_subparsers(dest='command', help='可用命令')
    
    # 生成卡密
    gen_parser = subparsers.add_parser('generate', help='生成卡密')
    gen_parser.add_argument('type', 
        choices=['B1', 'B2', 'B3', 'BY', 'G1', 'G2', 'G3', 'GY', 
                 'D1', 'D2', 'D3', 'DY', 'S1', 'S2', 'S3', 'SY',
                 'K1', 'K2', 'K3', 'KY'], 
        help='卡密類型 (B=白銀/G=黃金/D=鑽石/S=星耀/K=王者, 1=周/2=月/3=季/Y=年)')
    gen_parser.add_argument('-n', '--count', type=int, default=1, help='生成數量')
    gen_parser.add_argument('--batch', default='', help='批次名稱')
    gen_parser.add_argument('--notes', default='', help='備註')
    
    # 驗證卡密
    val_parser = subparsers.add_parser('validate', help='驗證卡密')
    val_parser.add_argument('key', help='卡密')
    
    # 統計
    stats_parser = subparsers.add_parser('stats', help='查看統計')
    
    # 導出
    export_parser = subparsers.add_parser('export', help='導出到CSV')
    export_parser.add_argument('-o', '--output', default='licenses.csv', help='輸出文件')
    export_parser.add_argument('--status', choices=['unused', 'used', 'disabled'], help='狀態過濾')
    
    # 列出未使用
    list_parser = subparsers.add_parser('list', help='列出未使用的卡密')
    list_parser.add_argument('-t', '--type', help='卡密類型過濾')
    
    # 價格表
    price_parser = subparsers.add_parser('prices', help='查看價格表')
    
    args = parser.parse_args()
    generator = LicenseGenerator()
    
    if args.command == 'generate':
        keys = generator.generate(args.type, args.count, args.batch, args.notes)
        type_info = LicenseGenerator.LICENSE_TYPES[args.type.upper()]
        print(f"\n🎟️ 生成了 {len(keys)} 個 {type_info['name']} 卡密：")
        for key in keys:
            print(f"  {key}")
    
    elif args.command == 'validate':
        valid, message, info = generator.validate(args.key)
        print(f"\n{'✅' if valid else '❌'} {message}")
        if info:
            print(f"  類型: {info['type_name']}")
            print(f"  等級: {info['level']}")
            print(f"  天數: {info['days']}")
            print(f"  價格: ¥{info['price']}")
    
    elif args.command == 'stats':
        stats = generator.get_stats()
        print("\n📊 卡密統計")
        print(f"  總數: {stats['total']}")
        print(f"  未使用: {stats['unused']}")
        print(f"  已使用: {stats['used']}")
        print(f"  已禁用: {stats['disabled']}")
        print(f"  已收入: ¥{stats['revenue']}")
        if stats['by_type']:
            print("\n按類型統計：")
            for type_code, type_stats in stats['by_type'].items():
                if type_code in LicenseGenerator.LICENSE_TYPES:
                    type_name = LicenseGenerator.LICENSE_TYPES[type_code]['name']
                    print(f"  {type_name}: {type_stats['total']} (未用: {type_stats['unused']}, 已用: {type_stats['used']})")
    
    elif args.command == 'export':
        count = generator.export_to_csv(Path(args.output), args.status)
        print(f"✅ 已導出 {count} 個卡密到 {args.output}")
    
    elif args.command == 'list':
        unused = generator.list_unused(args.type)
        print(f"\n未使用的卡密 ({len(unused)}個)：")
        for key in unused[:20]:
            print(f"  {key}")
        if len(unused) > 20:
            print(f"  ... 還有 {len(unused) - 20} 個")
    
    elif args.command == 'prices':
        print("\n💰 TG-Matrix 會員價格表（王者榮耀風格）")
        print("=" * 60)
        print(f"{'等級':<12} {'周卡':<8} {'月卡':<8} {'季卡':<8} {'年卡':<8}")
        print("-" * 60)
        levels = [
            ('🥈 白銀精英', 'silver'),
            ('🥇 黃金大師', 'gold'),
            ('💎 鑽石王牌', 'diamond'),
            ('🌟 星耀傳說', 'star'),
            ('👑 榮耀王者', 'king'),
        ]
        for name, level in levels:
            prices = LicenseGenerator.PRICES[level]
            print(f"{name:<10} ¥{prices['1']:<6} ¥{prices['2']:<6} ¥{prices['3']:<6} ¥{prices['Y']:<6}")
        print("=" * 60)
        print("⚔️ 青銅戰士 = 免費體驗（2賬號/20消息/10AI）")
    
    else:
        parser.print_help()


if __name__ == '__main__':
    main()
