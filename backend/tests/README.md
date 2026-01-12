# TG-Matrix Backend Tests

测试套件，用于验证后端功能的正确性。

## 运行测试

### 运行所有测试
```bash
cd backend
python -m pytest tests/ -v
```

### 运行特定测试文件
```bash
python -m pytest tests/test_validators.py -v
python -m pytest tests/test_database.py -v
python -m pytest tests/test_integration.py -v
```

### 运行特定测试类
```bash
python -m pytest tests/test_validators.py::TestAccountValidator -v
```

### 运行特定测试方法
```bash
python -m pytest tests/test_validators.py::TestAccountValidator::test_validate_phone_valid -v
```

### 使用测试运行脚本
```bash
cd backend
python tests/run_tests.py
```

## 测试结构

```
tests/
├── __init__.py           # 包初始化
├── conftest.py          # Pytest 配置和 fixtures
├── test_validators.py   # 验证器单元测试
├── test_database.py     # 数据库操作单元测试
├── test_integration.py # 集成测试
├── run_tests.py        # 测试运行脚本
└── README.md           # 本文档
```

## 测试类型

### 单元测试 (Unit Tests)
- **test_validators.py**: 测试数据验证逻辑
- **test_database.py**: 测试数据库 CRUD 操作

### 集成测试 (Integration Tests)
- **test_integration.py**: 测试命令处理和系统集成

## Fixtures

测试使用以下 fixtures（定义在 `conftest.py`）：

- `temp_db`: 临时数据库实例（每个测试使用独立的数据库）
- `sample_account`: 示例账户数据
- `sample_keyword_set`: 示例关键词集数据
- `sample_keyword`: 示例关键词数据
- `sample_group`: 示例群组数据
- `sample_template`: 示例模板数据
- `sample_campaign`: 示例活动数据

## 编写新测试

### 添加新的单元测试

1. 在相应的测试文件中添加新的测试类或方法
2. 使用 `@pytest.mark.asyncio` 装饰器标记异步测试
3. 使用 fixtures 获取测试数据

示例：
```python
@pytest.mark.asyncio
async def test_new_feature(self, temp_db):
    """Test new feature"""
    # Your test code here
    result = await temp_db.some_operation()
    assert result is not None
```

### 添加新的集成测试

1. 在 `test_integration.py` 中添加新的测试方法
2. 创建 `BackendService` 实例
3. Mock `send_event` 和 `send_log` 方法
4. 调用命令处理方法并验证结果

## 测试覆盖率

安装 coverage 工具：
```bash
pip install pytest-cov
```

运行测试并生成覆盖率报告：
```bash
python -m pytest tests/ --cov=. --cov-report=html
```

覆盖率报告将生成在 `htmlcov/index.html`

## 持续集成

测试可以在 CI/CD 流程中运行：

```yaml
# Example GitHub Actions
- name: Run tests
  run: |
    cd backend
    pip install -r requirements.txt
    python -m pytest tests/ -v
```

## 注意事项

1. 所有测试使用临时数据库，不会影响实际数据
2. 异步测试需要使用 `@pytest.mark.asyncio` 装饰器
3. 测试应该独立运行，不依赖执行顺序
4. 测试数据应该通过 fixtures 提供，而不是硬编码

