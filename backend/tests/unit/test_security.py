"""单元：密码与令牌工具。"""

from custom_data_toolkit.security import digest_equal, hash_password, sha256_hex, verify_password


def test_password_hash_roundtrip() -> None:
    hashed = hash_password("secret-pass")
    assert verify_password(hashed, "secret-pass")
    assert not verify_password(hashed, "wrong")


def test_sha256_and_digest_equal() -> None:
    left = sha256_hex("abc")
    right = sha256_hex("abc")
    assert digest_equal(left, right)
    assert not digest_equal(left, sha256_hex("abd"))
