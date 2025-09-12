pipeline {
  agent any

  environment {
    DOCKER_HUB_USER = 'nguyenducmanh247'
    IMAGE_TAG = "latest"
    K8S_PATH = 'k8s'
    KUBECONFIG = "/var/jenkins_home/kubeconfig/config"
  }

  stages {
    stage('Authenticate to DigitalOcean') {
      steps {
        withCredentials([string(credentialsId: 'do-token', variable: 'DO_TOKEN')]) {
          sh '''
            echo "🔐 Authenticating doctl..."
            doctl auth init -t $DO_TOKEN

            echo "📦 Getting kubeconfig for cluster..."
            mkdir -p $(dirname "$KUBECONFIG")
            doctl kubernetes cluster kubeconfig show dacn --access-token $DO_TOKEN > $KUBECONFIG
          '''
        }
      }
    }

    stage('Build & Push Docker Images') {
      steps {
        script {
          withCredentials([usernamePassword(credentialsId: 'docker-hub', usernameVariable: 'DOCKER_USER', passwordVariable: 'DOCKER_PASS')]) {
            sh "echo \$DOCKER_PASS | docker login -u \$DOCKER_USER --password-stdin"

            def services = ['user-service', 'product-service', 'order-service', 'payment-service', 'frontend', 'gateway']
            services.each { svc ->
              echo "🔧 Building and pushing image for: ${svc}"
              sh "docker build -t ${DOCKER_HUB_USER}/${svc}:${IMAGE_TAG} ${svc}"
              sh "docker push ${DOCKER_HUB_USER}/${svc}:${IMAGE_TAG}"
            }
          }
        }
      }
    }

    stage('Deploy to Kubernetes') {
      steps {
        echo "🚀 Deploying all Kubernetes manifests from ${K8S_PATH}/"
        sh "kubectl apply --validate=false -f ${K8S_PATH}/"
      }
    }
  }
}
