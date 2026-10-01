from flask import jsonify


def success(data, status=200):
    return jsonify({"data": data}), status


def error(code, message, status):
    return jsonify({"error": {"code": code, "message": message}}), status