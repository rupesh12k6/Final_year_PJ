package com.depa.provider.security;

import javax.crypto.Cipher;
import javax.crypto.KeyAgreement;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.security.*;
import java.security.spec.X509EncodedKeySpec;
import java.util.Base64;

public class DiffieHellmanUtil {

    private static final String ALGORITHM = "EC";
    private static final String KEY_AGREEMENT_ALGO = "ECDH";
    private static final String SYMMETRIC_ALGO = "AES/GCM/NoPadding";
    private static final int GCM_TAG_LENGTH = 128;

    public static KeyPair generateKeyPair() throws Exception {
        KeyPairGenerator keyPairGenerator = KeyPairGenerator.getInstance(ALGORITHM);
        keyPairGenerator.initialize(256);
        return keyPairGenerator.generateKeyPair();
    }

    public static String encodePublicKey(PublicKey publicKey) {
        return Base64.getEncoder().encodeToString(publicKey.getEncoded());
    }

    public static PublicKey decodePublicKey(String base64PublicKey) throws Exception {
        byte[] keyBytes = Base64.getDecoder().decode(base64PublicKey);
        X509EncodedKeySpec spec = new X509EncodedKeySpec(keyBytes);
        KeyFactory keyFactory = KeyFactory.getInstance(ALGORITHM);
        return keyFactory.generatePublic(spec);
    }

    public static byte[] generateSharedSecret(PrivateKey privateKey, PublicKey otherPublicKey) throws Exception {
        KeyAgreement keyAgreement = KeyAgreement.getInstance(KEY_AGREEMENT_ALGO);
        keyAgreement.init(privateKey);
        keyAgreement.doPhase(otherPublicKey, true);
        return keyAgreement.generateSecret();
    }

    public static String encrypt(String plaintext, byte[] sharedSecret) throws Exception {
        // Derive AES key (first 16 bytes for AES-128)
        byte[] aesKey = new byte[16];
        System.arraycopy(sharedSecret, 0, aesKey, 0, 16);
        SecretKeySpec secretKeySpec = new SecretKeySpec(aesKey, "AES");

        Cipher cipher = Cipher.getInstance(SYMMETRIC_ALGO);
        byte[] iv = new byte[12];
        SecureRandom random = new SecureRandom();
        random.nextBytes(iv);
        GCMParameterSpec parameterSpec = new GCMParameterSpec(GCM_TAG_LENGTH, iv);
        
        cipher.init(Cipher.ENCRYPT_MODE, secretKeySpec, parameterSpec);
        byte[] cipherText = cipher.doFinal(plaintext.getBytes());
        
        // Combine IV and cipherText
        byte[] combined = new byte[iv.length + cipherText.length];
        System.arraycopy(iv, 0, combined, 0, iv.length);
        System.arraycopy(cipherText, 0, combined, iv.length, cipherText.length);
        
        return Base64.getEncoder().encodeToString(combined);
    }

    public static String decrypt(String encryptedBase64, byte[] sharedSecret) throws Exception {
        byte[] aesKey = new byte[16];
        System.arraycopy(sharedSecret, 0, aesKey, 0, 16);
        SecretKeySpec secretKeySpec = new SecretKeySpec(aesKey, "AES");

        byte[] combined = Base64.getDecoder().decode(encryptedBase64);
        byte[] iv = new byte[12];
        byte[] cipherText = new byte[combined.length - 12];
        System.arraycopy(combined, 0, iv, 0, 12);
        System.arraycopy(combined, 12, cipherText, 0, cipherText.length);

        Cipher cipher = Cipher.getInstance(SYMMETRIC_ALGO);
        GCMParameterSpec parameterSpec = new GCMParameterSpec(GCM_TAG_LENGTH, iv);
        cipher.init(Cipher.DECRYPT_MODE, secretKeySpec, parameterSpec);
        
        byte[] plainText = cipher.doFinal(cipherText);
        return new String(plainText);
    }
}
