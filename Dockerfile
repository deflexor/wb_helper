# =============================================================================
# Multi-stage Docker build for wbhelper (Haskell backend)
# =============================================================================
# Stage 1: Build the Haskell application with optimal flags
# Stage 2: Create minimal runtime image
#
# Build optimizations:
#   - split-sections: Enable symbol stripping per-section
#   - fPIC: Position independent code for efficient linking
#   - optl-strip-all: Strip symbols during linking
#   - optc-O2: Optimize C code
#
# Runtime image: alpine-based for minimal footprint
# =============================================================================

# -----------------------------------------------------------------------------
# Stage 1: Builder
# -----------------------------------------------------------------------------
FROM ubuntu:24.04 AS builder

# Install GHC, Cabal, and build dependencies
# Using Ubuntu for better GHC compatibility vs alpine
RUN apt-get update && apt-get install -y --no-install-recommends \
    ghc \
    cabal-install \
    libgmp-dev \
    libssl-dev \
    zlib1g-dev \
    libffi-dev \
    libncurses-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy cabal files and fetch dependencies first (layer caching)
COPY backend/wbhelper.cabal backend/wbhelper.cabal
COPY backend/wbhelper.cabal cabal.project
RUN cabal update

# Build with optimizations - static where possible
# Note: GMP and tinfo remain dynamic; focus on symbol stripping
RUN cabal build \
    --flags="-split-sections -fPIC" \
    --ghc-options="-split-sections -fPIC -optl-strip-all -optc-O2" \
    --disable-debug-info \
    --enable-optimization=2 \
    wbhelper

# Extract the binary
RUN find /root/.cabal -name "wbhelper" -type f -executable \
    -exec strip -s {} \; \
    -exec cp {} /app/wbhelper \; || true

# Check binary size
RUN echo "=== Binary size after stripping ===" \
    && ls -lh /app/wbhelper 2>/dev/null || echo "Binary not found in expected location"

# -----------------------------------------------------------------------------
# Stage 2: Runtime image (minimal footprint)
# -----------------------------------------------------------------------------
FROM alpine:3.19 AS runtime

# Install only essential runtime dependencies
# Note: Haskell runtime (libgmp.so) may be needed if not fully static
RUN apk add --no-cache \
    ca-certificates \
    libffi \
    ncurses \
    openssl \
    gmp \
    zlib

# Create non-root user for security
RUN addgroup -g 1000 appgroup && \
    adduser -u 1000 -G appgroup -s /bin/sh -D appuser

WORKDIR /app

# Copy binary from builder stage
COPY --from=builder /app/wbhelper /app/wbhelper

# Ensure binary is executable
RUN chmod +x /app/wbhelper

# Switch to non-root user
USER appuser

# Expose the application port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:8080/health \
    || exit 1

# Run the application
ENTRYPOINT ["/app/wbhelper"]
