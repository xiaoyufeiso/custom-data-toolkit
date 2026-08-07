# 构建参数
ARG PYTHON_VERSION=3.12
ARG HARBOR_REGISTRY=harbor-dev.tendata.com.cn
ARG PIP_INDEX_URL=https://pypi.tuna.tsinghua.edu.cn/simple

# Stage 1: 构建依赖并打包
FROM ${HARBOR_REGISTRY}/basic/python-devel:${PYTHON_VERSION} AS builder

ARG PYTHON_VERSION
ARG HARBOR_REGISTRY
ARG PIP_INDEX_URL
ARG UV_CACHE_DIR=/cache/uv
ARG PIP_CACHE_DIR=/cache/pip

ENV UV_INDEX_URL=${PIP_INDEX_URL} \
    PIP_INDEX_URL=${PIP_INDEX_URL} \
    UV_CACHE_DIR=${UV_CACHE_DIR} \
    PIP_CACHE_DIR=${PIP_CACHE_DIR} \
    UV_LINK_MODE=copy

WORKDIR /app
USER root

COPY pyproject.toml uv.lock README.md /app/
RUN uv export --no-editable --no-dev --no-emit-workspace --frozen -o constraints.txt
RUN python${PYTHON_VERSION} -m venv --system-site-packages /tendata/app
RUN uv pip install --python /tendata/app/bin/python -r constraints.txt

COPY . /app/
RUN <<EOF
set -eux
uv build --force-pep517
if ! ls dist/*.whl >/dev/null 2>&1; then
  echo "No wheels found in dist/ after build!" >&2
  exit 1
fi
uv pip install --python /tendata/app/bin/python --no-deps dist/*.whl
EOF

# Stage 2: 运行镜像（非 root）
FROM ${HARBOR_REGISTRY}/basic/python-runtime:${PYTHON_VERSION} AS final

ARG PYTHON_VERSION
ARG HARBOR_REGISTRY

WORKDIR /tendata

COPY --from=builder --chown=1680:1680 /tendata/app /tendata/app
COPY --from=builder --chown=1680:1680 /app/alembic.ini /tendata/alembic.ini
COPY --from=builder --chown=1680:1680 /app/migrations /tendata/migrations

ENV PATH="/tendata/app/bin:/tendata/.local/bin:$PATH" \
    PYTHONPATH=/tendata \
    VIRTUAL_ENV="/tendata/app" \
    SERVICE_NAME="tendata-customs-tools" \
    OTEL_SERVICE_NAME="tendata-customs-tools" \
    OTEL_PYTHON_LOGGING_AUTO_INSTRUMENTATION_ENABLED="true" \
    UVICORN_APP="custom_data_toolkit.main:app" \
    UVICORN_HOST="0.0.0.0" \
    UVICORN_PORT="8000" \
    UVICORN_WORKERS="1" \
    SERVICE_GROUP="DEFAULT_GROUP"

USER 1680
EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://127.0.0.1:8000/api/v1/health || exit 1

CMD ["uvicorn", "custom_data_toolkit.main:app", "--host", "0.0.0.0", "--port", "8000"]
