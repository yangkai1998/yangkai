from app.xiaoai import (
    extract_query,
    extract_session_id,
    is_exit_request,
    is_launch_request,
    match_trigger,
    speak,
)


def test_extract_query_from_top_level():
    payload = {"query": "问助手 今天天气怎么样"}
    assert extract_query(payload) == "问助手 今天天气怎么样"


def test_extract_query_from_intent():
    payload = {
        "request": {
            "intent": {
                "query": "问杨凯 推荐晚饭",
            }
        }
    }
    assert extract_query(payload) == "问杨凯 推荐晚饭"


def test_match_trigger_prefix():
    matched, question = match_trigger("问助手，明天适合晾衣服吗", ["问助手", "帮我问"])
    assert matched is True
    assert question == "明天适合晾衣服吗"


def test_match_trigger_reject():
    matched, question = match_trigger("播放周杰伦的歌", ["问助手"])
    assert matched is False
    assert question == "播放周杰伦的歌"


def test_launch_and_exit():
    assert is_launch_request({"request": {"type": 0}}, "")
    assert is_launch_request({}, "打开杨凯助手")
    assert is_exit_request({"request": {"type": 2}}, "")
    assert is_exit_request({}, "退出")


def test_speak_shape():
    body = speak("你好", open_mic=True, session_end=False)
    assert body["version"] == "1.0"
    assert body["response"]["to_speak"]["text"] == "你好"
    assert body["response"]["open_mic"] is True
    assert body["is_session_end"] is False


def test_session_id():
    payload = {"session": {"session_id": "abc"}}
    assert extract_session_id(payload) == "abc"
