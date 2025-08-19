import pytest
from llm import parse_request


def test_parse_request_valid():
    req = '{"operation": "trim", "parameters": {"start": 0, "end": 5}}'
    result = parse_request(req)
    assert result["operation"] == "trim"
    assert result["parameters"] == {"start": 0, "end": 5}


def test_parse_request_invalid_json():
    with pytest.raises(ValueError):
        parse_request('{invalid json}')


def test_parse_request_missing_operation():
    with pytest.raises(ValueError):
        parse_request('{"parameters": {}}')
