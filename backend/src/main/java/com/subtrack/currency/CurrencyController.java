package com.subtrack.currency;

import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/currencies")
public class CurrencyController {

	private final CurrencyConverter currencyConverter;

	public CurrencyController(CurrencyConverter currencyConverter) {
		this.currencyConverter = currencyConverter;
	}

	@GetMapping
	public List<String> supported() {
		return currencyConverter.supportedCurrencies();
	}

}
