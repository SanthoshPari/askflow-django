# Use official Python image
FROM python:3.11-slim

# Inside-container working directory
WORKDIR /app

# Env: no .pyc, unbuffered output
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Install system deps (useful later)
RUN apt-get update && apt-get install -y \
    build-essential \
 && rm -rf /var/lib/apt/lists/*

# Copy requirements and install
COPY requirements.txt /app/
RUN pip install --no-cache-dir -r requirements.txt

# Copy the whole project (including manage.py, core, askflow, etc.)
COPY . /app/

# Expose port 8000
EXPOSE 8000

# Run Django dev server
CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"]
