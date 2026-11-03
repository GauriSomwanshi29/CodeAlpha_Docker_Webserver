# NEXUS | Docker Infrastructure

FROM nginx:latest

# Copy website files
COPY index.html /usr/share/nginx/html/index.html
COPY favicon.svg /usr/share/nginx/html/favicon.svg
COPY css/ /usr/share/nginx/html/css/
COPY js/ /usr/share/nginx/html/js/

# Expose port
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 CMD curl -f http://localhost/ || exit 1

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]