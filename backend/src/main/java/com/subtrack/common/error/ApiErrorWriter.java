package com.subtrack.common.error;

import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import tools.jackson.databind.json.JsonMapper;

/** Writes an {@link ApiError} from servlet filters, where controller advice does not apply. */
@Component
public class ApiErrorWriter {

	private final JsonMapper jsonMapper;

	public ApiErrorWriter(JsonMapper jsonMapper) {
		this.jsonMapper = jsonMapper;
	}

	public void write(HttpServletResponse response, ApiError error) throws IOException {
		response.setStatus(error.status());
		response.setContentType(MediaType.APPLICATION_JSON_VALUE);
		response.setCharacterEncoding("UTF-8");
		response.getWriter().write(jsonMapper.writeValueAsString(error));
	}

}
