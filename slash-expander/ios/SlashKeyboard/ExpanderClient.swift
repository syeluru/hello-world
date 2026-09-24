import Foundation

enum ExpanderConfig {
    /// Where the Python server (slash-expander/server) is reachable over HTTPS.
    static let serverURL = URL(string: "https://your-server.example.com")!
    /// Must match EXPANDER_TOKEN on the server.
    static let token = "change-me-to-a-long-random-string"
    /// Shown as one-tap buttons on the keyboard.
    static let quickCommands = ["/availability-tomorrow", "/availability-today"]
}

enum ExpanderClient {
    struct ServerError: LocalizedError {
        let message: String
        var errorDescription: String? { message }
    }

    static func expand(command: String, completion: @escaping (Result<String, Error>) -> Void) {
        var request = URLRequest(url: ExpanderConfig.serverURL.appendingPathComponent("expand"))
        request.httpMethod = "POST"
        request.timeoutInterval = 30
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("Bearer \(ExpanderConfig.token)", forHTTPHeaderField: "Authorization")
        request.httpBody = try? JSONSerialization.data(withJSONObject: [
            "command": command,
            "timezone": TimeZone.current.identifier,
        ])

        URLSession.shared.dataTask(with: request) { data, response, error in
            if let error { return completion(.failure(error)) }
            let status = (response as? HTTPURLResponse)?.statusCode ?? 0
            let json = data.flatMap { try? JSONSerialization.jsonObject(with: $0) as? [String: Any] }
            if status == 200, let text = json?["text"] as? String {
                completion(.success(text))
            } else {
                let detail = json?["detail"] as? String ?? "Server returned \(status)"
                completion(.failure(ServerError(message: detail)))
            }
        }.resume()
    }
}
