# False Positive Integration Tests do Copilot Ảo Giác
**Tags**: #testing #false-positive #copilot-hallucination #mocking #jest
**Date**: 2026-08-02
**Related**: [[PR-12]], [[stellar-sdk-mocking]], [[snarkjs-mocking]]

## Bối cảnh (Context)
Trong quá trình code PR-12 cho dự án `Proveil`, bot Copilot đã tự động tạo ra một bộ Integration Test (trong `api/test/routes.test.ts`) kiểm tra luồng API cấp chứng thực zk-SNARK.

## Root Cause (Cái sai cốt lõi)
1. **Mocking Toàn Cục (Over-mocking)**: Copilot đã viết code Mock cho hàm `generateAndVerifyProof` bằng `jest.spyOn().mockResolvedValue(...)`. Điều này làm mất khả năng chạy qua lớp Service Validation.
2. **Ảo Giác Payload (Hallucinated Payload)**: Dựa trên Mock, Copilot thản nhiên truyền `{ age: 15, minAge: 18 }` cho một endpoint vốn chỉ chấp nhận `{ birthdate }` (dựa theo schema mạch thực tế của `age_over_18`).
3. **Ảo ảnh xanh (The Green Illusion)**: Vì đã Mock ở cấp Service, Express Controller vẫn trả về HTTP 200, tạo ra hiện tượng **False Positive Test**. Test xanh nhưng nếu lên Production sẽ sập vì truy xuất thuộc tính `birthdate` bị undefined.

## Bài học Kinh nghiệm (Lessons Learned)
- Không bao giờ chấp nhận mù quáng code Mocking từ AI/Copilot mà không đối chiếu với Interface thực tế của Codebase/Smart Contract.
- Integration Test không nên mock quá cao ở tầng Service unless thực sự cần thiết (ví dụ: mock Network, Database I/O, file system, blockchain SDK).
- Phải áp dụng Coverage Gate tối thiểu (>= 80%) để ngăn chặn tình trạng Code có Unit Test thưa thớt bị "lách luật" bằng 1 file Integration Test duy nhất.


## L?i RPC Masking & Type Pollution (Copilot Review)
**Tags**: #rpc-masking #type-pollution #copilot-review
**Related**: [[PR-12]], [[stellar-service]], [[tsconfig]]

1. **RPC Masking (Nu?t l?i Soroban)**: H�m \checkVerificationOnChain\ d� b?t l?i rpc simulation s?p v� tr? v? \alse\ thay v� \	hrow\. H? l?y l� API Route vang HTTP 200 {verified: false} thay v� HTTP 500, d�nh l?a monitoring system. Lu�n ph?i n�m l?i RPC ra ngo�i.
2. **Type Pollution trong tsconfig**: \	sconfig.build.json\ n?u kh�ng d� thu?c t�nh \	ypes\ th� s? k? th?a t? \	sconfig.json\ (ch?a \jest\). �i?u n�y l�m r� r? c�c mock types c?a Jest v�o b?n production build.
