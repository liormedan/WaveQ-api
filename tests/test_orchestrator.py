import pytest

from orchestrator import parse_flow


def test_parse_flow_yaml(tmp_path):
    flow = tmp_path / "flow.yaml"
    flow.write_text(
        "workflow_name: demo\nsteps:\n  - name: cut\n    type: trim\n"
    )
    actions = parse_flow(str(flow))
    assert len(actions) == 1
    action = actions[0]
    assert action["operation"] == "trim"
    assert action["mqtt"]["topic"] == "audio/edit"
    assert action["queue_task"]["operation"] == "trim"


def test_parse_flow_invalid_type(tmp_path):
    flow = tmp_path / "bad.yaml"
    flow.write_text(
        "workflow_name: bad\nsteps:\n  - name: step\n    type: unknown\n"
    )
    with pytest.raises(ValueError):
        parse_flow(str(flow))
