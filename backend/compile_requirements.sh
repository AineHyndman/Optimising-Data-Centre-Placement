#!/bin/bash
# Script to compile Python dependencies from requirements.in to requirements.txt
# Uses pip-tools to generate a locked requirements.txt with all transitive dependencies

set -e  # Exit on error

# Determine script directory and project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
BACKEND_DIR="$SCRIPT_DIR"

echo "🔧 Compiling Python dependencies..."

# Check if requirements.in exists
if [ ! -f "$BACKEND_DIR/requirements.in" ]; then
    echo "❌ Error: requirements.in not found at $BACKEND_DIR/requirements.in"
    echo "   Create it with your direct dependencies first."
    exit 1
fi

# Check for virtual environment
VENV_PATH="$BACKEND_DIR/venv"
if [ ! -d "$VENV_PATH" ]; then
    echo "❌ Error: Virtual environment not found at $VENV_PATH"
    echo "   Create it with: python -m venv $BACKEND_DIR/venv"
    echo "   Then activate and install dependencies: source $BACKEND_DIR/venv/bin/activate && pip install -r $BACKEND_DIR/requirements.txt"
    exit 1
fi

# Activate virtual environment
source "$VENV_PATH/bin/activate"

# Check if pip-compile is available
if ! command -v pip-compile &> /dev/null; then
    echo "📦 Installing pip-tools..."
    pip install pip-tools
fi

# Run pip-compile
echo "📝 Generating requirements.txt from requirements.in..."
cd "$BACKEND_DIR"
if pip-compile requirements.in --output-file=requirements.txt --strip-extras; then
    # Show results
    echo "✅ Successfully compiled requirements.txt"
    echo "📋 Summary of installed packages:"
    echo "   - Direct dependencies: $(grep -c '^[a-zA-Z]' requirements.in 2>/dev/null || echo "0")"
    echo "   - Total dependencies (including transitive): $(grep -c '^[a-zA-Z]' requirements.txt 2>/dev/null || echo "0")"
    echo ""
    echo "🔁 To update Docker image with new dependencies:"
    echo "   docker compose up --build"
else
    echo "❌ Failed to compile requirements.txt"
    exit 1
fi
