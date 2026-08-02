import { Request, Response, NextFunction } from "express";
import { validateProofRequest } from "../src/middleware/validate";

describe("validateProofRequest middleware", () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let nextFunction: NextFunction;

  beforeEach(() => {
    mockRequest = {
      body: {},
    };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    nextFunction = jest.fn();
  });

  test("returns 400 if proofType is missing", () => {
    mockRequest.body = {
      walletAddress: "GA7Q3XZ56XNBLV3W2G34PEX35A43W64EXY34M5P34P34P34P34P34P34",
      data: { age: 25 },
    };

    validateProofRequest(
      mockRequest as Request,
      mockResponse as Response,
      nextFunction,
    );

    expect(mockResponse.status).toHaveBeenCalledWith(400);
    expect(mockResponse.json).toHaveBeenCalledWith({
      error: "proofType is required",
    });
    expect(nextFunction).not.toHaveBeenCalled();
  });

  test("returns 400 if proofType is unsupported", () => {
    mockRequest.body = {
      proofType: "unsupported_proof_type",
      walletAddress: "GA7Q3XZ56XNBLV3W2G34PEX35A43W64EXY34M5P34P34P34P34P34P34",
      data: { age: 25 },
    };

    validateProofRequest(
      mockRequest as Request,
      mockResponse as Response,
      nextFunction,
    );

    expect(mockResponse.status).toHaveBeenCalledWith(400);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.stringContaining("unsupported proofType"),
      }),
    );
    expect(nextFunction).not.toHaveBeenCalled();
  });

  test("returns 400 if walletAddress is missing", () => {
    mockRequest.body = {
      proofType: "age_over_18",
      data: { age: 25 },
    };

    validateProofRequest(
      mockRequest as Request,
      mockResponse as Response,
      nextFunction,
    );

    expect(mockResponse.status).toHaveBeenCalledWith(400);
    expect(mockResponse.json).toHaveBeenCalledWith({
      error: "walletAddress is required",
    });
    expect(nextFunction).not.toHaveBeenCalled();
  });

  test("returns 400 if walletAddress does not start with G or has invalid length", () => {
    mockRequest.body = {
      proofType: "age_over_18",
      walletAddress: "INVALID_ADDRESS",
      data: { age: 25 },
    };

    validateProofRequest(
      mockRequest as Request,
      mockResponse as Response,
      nextFunction,
    );

    expect(mockResponse.status).toHaveBeenCalledWith(400);
    expect(mockResponse.json).toHaveBeenCalledWith({
      error: "invalid Stellar walletAddress",
    });
    expect(nextFunction).not.toHaveBeenCalled();
  });

  test("returns 400 if data is missing or not an object", () => {
    mockRequest.body = {
      proofType: "age_over_18",
      walletAddress: "GB7B2Y4C3XNBLV3W2G34PEX35A43W64EXY34M5P34P34P34P34P34P34",
      data: "invalid_string_data",
    };

    validateProofRequest(
      mockRequest as Request,
      mockResponse as Response,
      nextFunction,
    );

    expect(mockResponse.status).toHaveBeenCalledWith(400);
    expect(mockResponse.json).toHaveBeenCalledWith({
      error: "data object is required",
    });
    expect(nextFunction).not.toHaveBeenCalled();
  });

  test("calls next() when request body is valid", () => {
    mockRequest.body = {
      proofType: "age_over_18",
      walletAddress: "GC7Q3XZ56XNBLV3W2G34PEX35A43W64EXY34M5P34P34P34P34P34P34",
      data: { age: 21, minAge: 18 },
    };

    validateProofRequest(
      mockRequest as Request,
      mockResponse as Response,
      nextFunction,
    );

    expect(nextFunction).toHaveBeenCalled();
    expect(mockResponse.status).not.toHaveBeenCalled();
  });
});
